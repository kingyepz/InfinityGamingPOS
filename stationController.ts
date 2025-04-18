import { Router } from "express";
import { z } from "zod";
import { IStorage } from "../storage";
import { insertStationSchema, stationStatusEnum } from "@shared/schema";

export function handleStationsRequests(storage: IStorage, broadcast: (data: any) => void) {
  const router = Router();

  // Get all stations
  router.get('/', async (req, res) => {
    try {
      const stations = await storage.getAllStations();
      res.json(stations);
    } catch (error) {
      console.error('Error fetching stations:', error);
      res.status(500).json({ message: 'Error fetching stations' });
    }
  });

  // Get a specific station
  router.get('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const station = await storage.getStation(id);
      
      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }
      
      res.json(station);
    } catch (error) {
      console.error('Error fetching station:', error);
      res.status(500).json({ message: 'Error fetching station' });
    }
  });

  // Get active session for a station
  router.get('/:id/active-session', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const session = await storage.getActiveSessionByStationId(id);
      
      if (!session) {
        return res.status(404).json({ message: 'No active session found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error fetching active session:', error);
      res.status(500).json({ message: 'Error fetching active session' });
    }
  });

  // Create a new station
  router.post('/', async (req, res) => {
    try {
      const validatedData = insertStationSchema.parse(req.body);
      const station = await storage.createStation(validatedData);
      
      // Broadcast the new station to all connected clients
      broadcast({
        type: 'STATION_CREATED',
        data: station
      });
      
      res.status(201).json(station);
    } catch (error) {
      console.error('Error creating station:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid station data', 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: 'Error creating station' });
    }
  });

  // Update a station
  router.patch('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      // Validate the update fields
      const updateSchema = z.object({
        name: z.string().optional(),
        stationType: stationStatusEnum.optional(),
        status: stationStatusEnum.optional(),
        ratePerHour: z.number().optional(),
        ratePerGame: z.number().optional(),
        maintenanceReason: z.string().optional(),
        maintenanceEta: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedStation = await storage.updateStation(id, validatedData);
      
      if (!updatedStation) {
        return res.status(404).json({ message: 'Station not found' });
      }
      
      // Broadcast the station update
      broadcast({
        type: 'STATION_UPDATED',
        data: updatedStation
      });
      
      res.json(updatedStation);
    } catch (error) {
      console.error('Error updating station:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid station data', 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: 'Error updating station' });
    }
  });

  // Change station status to maintenance
  router.post('/:id/maintenance', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      // Validate the maintenance data
      const maintenanceSchema = z.object({
        reason: z.string(),
        eta: z.string().optional(),
      });
      
      const { reason, eta } = maintenanceSchema.parse(req.body);
      
      const updatedStation = await storage.updateStation(id, {
        status: 'MAINTENANCE',
        maintenanceReason: reason,
        maintenanceEta: eta,
      });
      
      if (!updatedStation) {
        return res.status(404).json({ message: 'Station not found' });
      }
      
      // Broadcast the status change
      broadcast({
        type: 'STATION_MAINTENANCE',
        data: updatedStation
      });
      
      res.json(updatedStation);
    } catch (error) {
      console.error('Error setting maintenance status:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid maintenance data', 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: 'Error setting maintenance status' });
    }
  });

  return router;
}
