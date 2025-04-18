import { Router } from "express";
import { z } from "zod";
import { IStorage } from "../storage";
import { insertSessionSchema, sessionTypeEnum } from "@shared/schema";

export function handleSessionsRequests(storage: IStorage, broadcast: (data: any) => void) {
  const router = Router();

  // Get all active sessions
  router.get('/active', async (req, res) => {
    try {
      const activeSessions = await storage.getAllActiveSessions();
      res.json(activeSessions);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      res.status(500).json({ message: 'Error fetching active sessions' });
    }
  });

  // Get a specific session
  router.get('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const session = await storage.getSession(id);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ message: 'Error fetching session' });
    }
  });

  // Create a new session
  router.post('/', async (req, res) => {
    try {
      // Check if station is available
      const stationId = req.body.stationId;
      const station = await storage.getStation(stationId);
      
      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }
      
      if (station.status !== 'AVAILABLE') {
        return res.status(400).json({ message: 'Station is not available' });
      }
      
      // Validate session data
      const validatedData = insertSessionSchema.parse(req.body);
      
      // Create the session
      const session = await storage.createSession(validatedData);
      
      // Broadcast the new session
      broadcast({
        type: 'SESSION_CREATED',
        data: session
      });
      
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid session data', 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: 'Error creating session' });
    }
  });

  // End a session
  router.post('/:id/end', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      // Get the session to calculate total amount
      const session = await storage.getSession(id);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      if (session.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Session is not active' });
      }
      
      // Get the station info for pricing
      const station = await storage.getStation(session.stationId);
      
      if (!station) {
        return res.status(500).json({ message: 'Station not found' });
      }
      
      // Calculate the total amount based on session type and duration
      let totalAmount = 0;
      
      if (session.sessionType === 'FIXED') {
        // Fixed price per game
        totalAmount = station.ratePerGame || 0;
      } else {
        // Hourly rate
        const startTime = new Date(session.startTime);
        const endTime = new Date();
        const durationInHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalAmount = Math.ceil(durationInHours * station.ratePerHour);
      }
      
      // End the session
      const updatedSession = await storage.endSession(id, totalAmount);
      
      if (!updatedSession) {
        return res.status(500).json({ message: 'Failed to end session' });
      }
      
      // Create payment entry if not already paid
      await storage.createPayment({
        sessionId: id,
        customerId: session.customerId,
        amount: totalAmount,
        paymentMethod: 'PENDING', // Default to pending, will be updated when payment is made
        createdBy: session.createdBy || undefined
      });
      
      // Broadcast session ended
      broadcast({
        type: 'SESSION_ENDED',
        data: updatedSession
      });
      
      res.json(updatedSession);
    } catch (error) {
      console.error('Error ending session:', error);
      res.status(500).json({ message: 'Error ending session' });
    }
  });

  return router;
}
