import { Router } from "express";
import { IStorage } from "../storage";

export function handleSeedRequests(storage: IStorage, broadcast: (data: any) => void) {
  const router = Router();

  // Seed sample data
  router.post('/', async (req, res) => {
    try {
      // Create sample gaming stations
      const stationTypes = ['PS5', 'XBOX', 'PC', 'VR'];
      const stationPromises = [];

      // Create 2 of each station type
      for (let i = 0; i < stationTypes.length; i++) {
        const type = stationTypes[i];
        for (let j = 1; j <= 2; j++) {
          stationPromises.push(
            storage.createStation({
              name: `${type} Station ${j}`,
              stationType: type as any,
              ratePerHour: type === 'VR' ? 400 : 300,
              ratePerGame: type === 'VR' ? 500 : 400,
              status: 'AVAILABLE',
            })
          );
        }
      }

      const stations = await Promise.all(stationPromises);

      // Create sample games
      const gamesData = [
        {
          title: 'FIFA 24',
          platforms: ['PS5', 'XBOX', 'PC']
        },
        {
          title: 'Call of Duty: Modern Warfare III',
          platforms: ['PS5', 'XBOX', 'PC']
        },
        {
          title: 'Grand Theft Auto V',
          platforms: ['PS5', 'XBOX', 'PC']
        },
        {
          title: 'Fortnite',
          platforms: ['PS5', 'XBOX', 'PC']
        },
        {
          title: 'Minecraft',
          platforms: ['PS5', 'XBOX', 'PC']
        },
        {
          title: 'NBA 2K24',
          platforms: ['PS5', 'XBOX']
        }
      ];

      const gamePromises = gamesData.map(game => storage.createGame(game));
      const games = await Promise.all(gamePromises);

      // Create sample customers
      const customersData = [
        {
          fullName: 'John Doe',
          phoneNumber: '254712345678',
          email: 'john@example.com'
        },
        {
          fullName: 'Jane Smith',
          phoneNumber: '254723456789',
          email: 'jane@example.com'
        },
        {
          fullName: 'Bob Johnson',
          phoneNumber: '254734567890',
          email: 'bob@example.com'
        }
      ];

      const customerPromises = customersData.map(customer => storage.createCustomer(customer));
      const customers = await Promise.all(customerPromises);

      // Create a sample active session
      const session = await storage.createSession({
        stationId: stations[0].id,
        customerId: customers[0].id,
        gameId: games[0].id,
        startTime: new Date(),
        sessionType: 'HOURLY',
        duration: 60 // 1 hour in minutes
      });

      // Update the station status to active
      await storage.updateStation(stations[0].id, {
        status: 'ACTIVE'
      });

      // Update stats
      const stats = await storage.getTodayStats();
      
      if (stats) {
        await storage.updateStats({
          activeStations: 1,
          activeUsers: 1,
          totalHours: 1,
          totalRevenue: 300
        });
      } else {
        // If no stats exist, just create a default entry by updating
        await storage.updateStats({
          activeStations: 1,
          activeUsers: 1,
          totalHours: 1,
          totalRevenue: 300
        });
      }

      // Broadcast updates
      broadcast({
        type: 'DATA_SEEDED',
        data: {
          stations: stations.length,
          games: games.length,
          customers: customers.length,
          sessions: 1
        }
      });

      res.json({
        message: 'Sample data seeded successfully',
        stats: {
          stations: stations.length,
          games: games.length,
          customers: customers.length,
          sessions: 1
        }
      });
    } catch (error) {
      console.error('Error seeding data:', error);
      res.status(500).json({ message: 'Error seeding data', error: String(error) });
    }
  });

  // Clear all data
  router.delete('/', async (req, res) => {
    try {
      // In a production environment, you would have proper methods to clear data
      // For this demo, we'll just inform that this endpoint is not implemented
      res.status(501).json({ message: 'Clearing data not implemented' });
    } catch (error) {
      console.error('Error clearing data:', error);
      res.status(500).json({ message: 'Error clearing data' });
    }
  });

  return router;
}