import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { 
  insertCustomerSchema, 
  insertStationSchema, 
  insertGameSchema,
  insertSessionSchema,
  insertPaymentSchema,
  insertStatSchema
} from "@shared/schema";

// Import controllers
import { handleStationsRequests } from "./controllers/stationController";
import { handleSessionsRequests } from "./controllers/sessionController";
import { handleCustomersRequests } from "./controllers/customerController";
import { handlePaymentsRequests } from "./controllers/paymentController";
import { handleCashPaymentsRequests } from "./controllers/cashPaymentController";
import { handleReceiptRequests, generateReceipt } from "./controllers/receiptController";
import { handleSeedRequests } from "./controllers/seedController";
import { handleReportsRequests } from "./controllers/reportController";


export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server for real-time updates
  // Use noServer option to prevent WebSocket errors
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    clientTracking: true
  });

  // Handle connection issues
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // Setup ping interval to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000);

  wss.on('connection', (ws) => {
    console.log('Client connected');

    // Handle client messages
    ws.on('message', (message) => {
      console.log('Received: %s', message);
    });

    // Handle connection close
    ws.on('close', () => {
      console.log('Client disconnected');
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Successfully connected to WebSocket server' }));
  });

  // Clean up interval on server close
  httpServer.on('close', () => {
    clearInterval(interval);
  });

  // Broadcast function to send updates to all connected clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(data));
        } catch (error) {
          console.error('Error broadcasting message:', error);
        }
      }
    });
  };

  // Register API routes with the WebSocket broadcast function
  app.use('/api/stations', handleStationsRequests(storage, broadcast));
  app.use('/api/sessions', handleSessionsRequests(storage, broadcast));
  app.use('/api/customers', handleCustomersRequests(storage, broadcast));
  app.use('/api/payments', handlePaymentsRequests(storage, broadcast));
  app.use('/api/cashpayments', handleCashPaymentsRequests(storage, broadcast)); // Cash payment route
  app.use('/api/receipts', handleReceiptRequests(storage, broadcast)); // Receipt route
  app.use('/api/seed', handleSeedRequests(storage, broadcast));
  app.use('/api/reports', handleReportsRequests(storage, broadcast)); // Report route
  
  // Add transaction endpoint
  app.get('/api/transactions/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid transaction ID' });
      }
      
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      res.json(transaction);
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Note: Cash payments are now handled by the /api/cashpayments route via the handleCashPaymentsRequests controller

  // Receipt Routes - direct endpoint for receiving PDFs
  app.get('/api/receipts/:transactionId', generateReceipt);

  // Setup stats endpoint
  app.get('/api/stats/today', async (req, res) => {
    try {
      const stats = await storage.getTodayStats();

      if (!stats) {
        // If no stats exist for today, return default values
        return res.json({
          activeStations: 0,
          activeUsers: 0,
          totalHours: 0,
          totalRevenue: 0,
        });
      }

      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: 'Error fetching stats' });
    }
  });

  // Setup games endpoint
  app.get('/api/games', async (req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error) {
      console.error('Error fetching games:', error);
      res.status(500).json({ message: 'Error fetching games' });
    }
  });

  app.get('/api/games/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const game = await storage.getGame(id);

      if (!game) {
        return res.status(404).json({ message: 'Game not found' });
      }

      res.json(game);
    } catch (error) {
      console.error('Error fetching game:', error);
      res.status(500).json({ message: 'Error fetching game' });
    }
  });

  app.post('/api/games', async (req, res) => {
    try {
      const validatedData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(validatedData);

      // Notify all connected clients about the new game
      broadcast({
        type: 'GAME_CREATED',
        data: game
      });

      res.status(201).json(game);
    } catch (error) {
      console.error('Error creating game:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid game data', 
          errors: error.errors 
        });
      }

      res.status(500).json({ message: 'Error creating game' });
    }
  });

  app.patch('/api/games/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      // Get the existing game to check if it exists
      const existingGame = await storage.getGame(id);
      if (!existingGame) {
        return res.status(404).json({ message: 'Game not found' });
      }

      // Create a schema for updates (partial version of insertGameSchema)
      const updateGameSchema = insertGameSchema.partial();
      const validatedData = updateGameSchema.parse(req.body);

      // Apply special rules for VR games
      if (validatedData.isVrGame === true) {
        validatedData.pricePerGame = 100; // VR games have fixed price of 100 KES
      }

      const updatedGame = await storage.updateGame(id, validatedData);

      // Notify all connected clients about the updated game
      broadcast({
        type: 'GAME_UPDATED',
        data: updatedGame
      });

      res.json(updatedGame);
    } catch (error) {
      console.error('Error updating game:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid game data', 
          errors: error.errors 
        });
      }

      res.status(500).json({ message: 'Error updating game' });
    }
  });

  app.delete('/api/games/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      // Get the existing game to check if it exists
      const existingGame = await storage.getGame(id);
      if (!existingGame) {
        return res.status(404).json({ message: 'Game not found' });
      }

      await storage.deleteGame(id);

      // Notify all connected clients about the deleted game
      broadcast({
        type: 'GAME_DELETED',
        data: { id }
      });

      res.json({ message: 'Game deleted successfully' });
    } catch (error) {
      console.error('Error deleting game:', error);
      res.status(500).json({ message: 'Error deleting game' });
    }
  });

  return httpServer;
}