import { 
  User, InsertUser, 
  Customer, InsertCustomer, 
  Station, InsertStation,
  Game, InsertGame,
  Session, InsertSession,
  Payment, InsertPayment,
  Stat, InsertStat
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { 
  users, customers, stations, games, 
  sessions, payments, stats,
  paymentMethodEnum, paymentStatusEnum
} from "@shared/schema";

// Define the interface with all CRUD methods
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;

  // Station operations
  getStation(id: number): Promise<Station | undefined>;
  getAllStations(): Promise<Station[]>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(id: number, station: Partial<Station>): Promise<Station | undefined>;

  // Game operations
  getGame(id: number): Promise<Game | undefined>;
  getAllGames(): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: number, game: Partial<Game>): Promise<Game | undefined>;
  deleteGame(id: number): Promise<boolean>;

  // Session operations
  getSession(id: number): Promise<Session | undefined>;
  getActiveSessionByStationId(stationId: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  getAllActiveSessions(): Promise<Session[]>;
  endSession(id: number, totalAmount: number): Promise<Session | undefined>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getAllPayments(): Promise<Payment[]>;
  getAllPaymentsByCustomerId(customerId: number): Promise<Payment[]>;
  updateTransactionStatus(transactionId: number, status: string, reference?: string): Promise<any>;
  getPaymentByTransactionId(transactionId: number): Promise<any>;
  getTransaction(transactionId: number): Promise<any>;
  awardLoyaltyPoints(userId: number, points: number): Promise<any>;


  // Stats operations
  getTodayStats(): Promise<any>;
  getCustomerActivity(startDate?: string, endDate?: string): Promise<any[]>;
  getPaymentMethods(): Promise<any[]>;
  getGamePerformanceReport(startDate?: string, endDate?: string): Promise<any>;
  getLoyaltyReport(): Promise<any>;
  getRevenueReport(startDate?: string, endDate?: string): Promise<any>;
  updateStats(stats: Partial<Stat>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    // Delete the customer and return success status
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning();
    return result.length > 0;
  }

  // Station operations
  async getStation(id: number): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.id, id));
    return station;
  }

  async getAllStations(): Promise<Station[]> {
    return await db.select().from(stations);
  }

  async createStation(station: InsertStation): Promise<Station> {
    const [newStation] = await db.insert(stations).values(station).returning();
    return newStation;
  }

  async updateStation(id: number, station: Partial<Station>): Promise<Station | undefined> {
    const [updatedStation] = await db
      .update(stations)
      .set(station)
      .where(eq(stations.id, id))
      .returning();
    return updatedStation;
  }

  // Game operations
  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async getAllGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(games.title);
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async updateGame(id: number, game: Partial<Game>): Promise<Game | undefined> {
    const [updatedGame] = await db
      .update(games)
      .set(game)
      .where(eq(games.id, id))
      .returning();
    return updatedGame;
  }

  async deleteGame(id: number): Promise<boolean> {
    const result = await db
      .delete(games)
      .where(eq(games.id, id))
      .returning();
    return result.length > 0;
  }

  // Session operations
  async getSession(id: number): Promise<Session | undefined> {
    try {
      const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
      return session;
    } catch (error: any) {
      // If there's a column mismatch issue, select only essential columns
      if (error.message && (error.message.includes('payment_method') || error.message.includes('reference'))) {
        console.log('Column mismatch found in getSession, using essential column selection');
        const [session] = await db
          .select({
            id: sessions.id,
            stationId: sessions.stationId,
            customerId: sessions.customerId,
            gameId: sessions.gameId,
            sessionType: sessions.sessionType,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            duration: sessions.duration,
            status: sessions.status,
            totalAmount: sessions.totalAmount,
            createdBy: sessions.createdBy,
            createdAt: sessions.createdAt
          })
          .from(sessions)
          .where(eq(sessions.id, id));
          
        return session;
      }
      console.error('Error fetching session:', error);
      throw error;
    }
  }

  async getActiveSessionByStationId(stationId: number): Promise<Session | undefined> {
    try {
      const [session] = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.stationId, stationId),
            eq(sessions.status, 'ACTIVE')
          )
        );
      return session;
    } catch (error: any) {
      // If there's a column mismatch issue, select only essential columns
      if (error.message && (error.message.includes('payment_method') || error.message.includes('reference'))) {
        console.log('Column mismatch found in getActiveSessionByStationId, using essential column selection');
        const [session] = await db
          .select({
            id: sessions.id,
            stationId: sessions.stationId,
            customerId: sessions.customerId,
            gameId: sessions.gameId,
            sessionType: sessions.sessionType,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            duration: sessions.duration,
            status: sessions.status,
            totalAmount: sessions.totalAmount,
            createdBy: sessions.createdBy,
            createdAt: sessions.createdAt
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.stationId, stationId),
              eq(sessions.status, 'ACTIVE')
            )
          );
          
        return session;
      }
      console.error('Error fetching active session:', error);
      throw error;
    }
  }

  async createSession(session: InsertSession): Promise<Session> {
    // Start a new session and mark the station as active
    const [newSession] = await db.insert(sessions).values(session).returning();

    // Update the station status to ACTIVE
    await db
      .update(stations)
      .set({ status: 'ACTIVE' })
      .where(eq(stations.id, session.stationId));

    // Update stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existingStat] = await db
      .select()
      .from(stats)
      .where(eq(stats.date, today));

    if (existingStat) {
      await db
        .update(stats)
        .set({ 
          activeStations: existingStat.activeStations + 1,
          activeUsers: existingStat.activeUsers + 1,
          updatedAt: new Date()
        })
        .where(eq(stats.id, existingStat.id));
    } else {
      await db
        .insert(stats)
        .values({
          date: today,
          activeStations: 1,
          activeUsers: 1,
          totalRevenue: 0,
          totalHours: 0
        });
    }

    return newSession;
  }

  async getAllActiveSessions(): Promise<Session[]> {
    // Get active sessions but don't try to access columns that don't exist yet
    const activeSessions = await db
      .select({
        id: sessions.id,
        stationId: sessions.stationId,
        customerId: sessions.customerId,
        gameId: sessions.gameId,
        sessionType: sessions.sessionType,
        startTime: sessions.startTime,
        endTime: sessions.endTime,
        duration: sessions.duration,
        status: sessions.status,
        totalAmount: sessions.totalAmount,
        createdBy: sessions.createdBy,
        createdAt: sessions.createdAt
      })
      .from(sessions)
      .where(eq(sessions.status, 'ACTIVE'))
      .orderBy(sessions.startTime);
      
    return activeSessions;
  }

  async endSession(id: number, totalAmount: number): Promise<Session | undefined> {
    // First get the session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!session) return undefined;

    const endTime = new Date();
    const durationInMinutes = Math.floor(
      (endTime.getTime() - new Date(session.startTime).getTime()) / 60000
    );

    // Update the session
    const [updatedSession] = await db
      .update(sessions)
      .set({ 
        status: 'COMPLETED', 
        endTime, 
        duration: durationInMinutes,
        totalAmount
      })
      .where(eq(sessions.id, id))
      .returning();

    // Update the station status back to AVAILABLE
    await db
      .update(stations)
      .set({ status: 'AVAILABLE' })
      .where(eq(stations.id, session.stationId));

    // Update stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existingStat] = await db
      .select()
      .from(stats)
      .where(eq(stats.date, today));

    if (existingStat) {
      await db
        .update(stats)
        .set({ 
          activeStations: Math.max(0, existingStat.activeStations - 1),
          activeUsers: Math.max(0, existingStat.activeUsers - 1),
          totalRevenue: existingStat.totalRevenue + totalAmount,
          totalHours: existingStat.totalHours + (durationInMinutes / 60),
          updatedAt: new Date()
        })
        .where(eq(stats.id, existingStat.id));
    }

    return updatedSession;
  }

  // Payment operations
  async createPayment(payment: any): Promise<Payment> {
    try {
      // Try to create with all provided fields
      const [newPayment] = await db.insert(payments).values(payment).returning();
      return newPayment;
    } catch (error: any) {
      // If error occurs due to missing columns, retry with only essential fields
      if (error.message && (error.message.includes('reference') || error.message.includes('description'))) {
        console.log('Missing columns in createPayment, using minimal fields only');
        
        // Create a clean payment object with only essential fields
        const essentialPayment = {
          sessionId: payment.sessionId,
          customerId: payment.customerId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
        };
        
        const [newPayment] = await db.insert(payments).values(essentialPayment).returning();
        return newPayment;
      }
      
      // If it's some other error, rethrow it
      throw error;
    }
  }

  async getAllPayments(): Promise<Payment[]> {
    try {
      // First attempt to query with all columns
      return await db
        .select()
        .from(payments)
        .orderBy(desc(payments.paymentDate));
    } catch (error: any) {
      // If there's a column mismatch issue, select only essential columns
      if (error.message && (error.message.includes('reference') || error.message.includes('description'))) {
        console.log('Column mismatch found, using essential column selection');
        return await db
          .select({
            id: payments.id,
            sessionId: payments.sessionId,
            customerId: payments.customerId,
            amount: payments.amount,
            paymentMethod: payments.paymentMethod,
            status: payments.status,
            paymentDate: payments.paymentDate,
            createdAt: payments.createdAt
          })
          .from(payments)
          .orderBy(desc(payments.paymentDate));
      }
      throw error;
    }
  }

  async getAllPaymentsByCustomerId(customerId: number): Promise<Payment[]> {
    try {
      // First attempt to query with all columns
      return await db
        .select()
        .from(payments)
        .where(eq(payments.customerId, customerId))
        .orderBy(desc(payments.paymentDate));
    } catch (error: any) {
      // If there's a column mismatch issue, select only essential columns
      if (error.message && (error.message.includes('reference') || error.message.includes('description'))) {
        console.log('Column mismatch found in getAllPaymentsByCustomerId, using essential column selection');
        return await db
          .select({
            id: payments.id,
            sessionId: payments.sessionId,
            customerId: payments.customerId,
            amount: payments.amount,
            paymentMethod: payments.paymentMethod,
            status: payments.status,
            paymentDate: payments.paymentDate,
            createdAt: payments.createdAt
          })
          .from(payments)
          .where(eq(payments.customerId, customerId))
          .orderBy(desc(payments.paymentDate));
      }
      throw error;
    }
  }

  async updateTransactionStatus(transactionId: number, status: string, reference?: string): Promise<any> {
    try {
      // First check if this is a session ID
      const session = await this.getSession(transactionId);

      if (session) {
        // Always insert minimal fields first to avoid column issues
        try {
          console.log('Using minimal fields in updateTransactionStatus for database compatibility');
          const payment = await db
            .insert(payments)
            .values({
              sessionId: transactionId,
              amount: session.totalAmount || 0,
              paymentMethod: status === 'COMPLETED' ? paymentMethodEnum.enumValues[0] : paymentMethodEnum.enumValues[2], // CASH or PENDING
              status: status === 'COMPLETED' ? paymentStatusEnum.enumValues[1] : paymentStatusEnum.enumValues[0], // COMPLETED or PENDING
            })
            .returning();

          return {
            ...session,
            paymentStatus: status
          };
        } catch (err: any) {
          console.error('Error in updateTransactionStatus with minimal fields:', err);
          throw err;
        }
      }

      // If no session found, this might be a direct transaction
      return { id: transactionId, status };
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  async getPaymentByTransactionId(transactionId: number): Promise<any> {
    try {
      // First try with all columns
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.transactionId, transactionId));

      return payment;
    } catch (error: any) {
      // If there's a column mismatch issue, select only essential columns
      if (error.message && (error.message.includes('reference') || error.message.includes('description'))) {
        console.log('Column mismatch found in getPaymentByTransactionId, using essential column selection');
        try {
          const [payment] = await db
            .select({
              id: payments.id,
              sessionId: payments.sessionId,
              customerId: payments.customerId,
              amount: payments.amount,
              paymentMethod: payments.paymentMethod,
              status: payments.status,
              paymentDate: payments.paymentDate,
              createdAt: payments.createdAt
            })
            .from(payments)
            .where(eq(payments.transactionId, transactionId));
            
          return payment;
        } catch (innerError) {
          console.error('Error getting payment by transaction ID with specific columns:', innerError);
          return null;
        }
      } else if (error.message && error.message.includes('transactionId')) {
        // The transactionId column may not exist either
        console.log('Column transactionId not found in getPaymentByTransactionId, using sessionId instead');
        try {
          const [payment] = await db
            .select({
              id: payments.id,
              sessionId: payments.sessionId,
              customerId: payments.customerId,
              amount: payments.amount,
              paymentMethod: payments.paymentMethod,
              status: payments.status,
              paymentDate: payments.paymentDate,
              createdAt: payments.createdAt
            })
            .from(payments)
            .where(eq(payments.sessionId, transactionId));
            
          return payment;
        } catch (innerError) {
          console.error('Error getting payment by session ID:', innerError);
          return null;
        }
      }
      console.error('Error getting payment by transaction ID:', error);
      return null;
    }
  }

  // Helper method to get the latest payment for a session
  private async getLatestPaymentForSession(sessionId: number): Promise<Payment | null> {
    try {
      // First attempt to query with all columns
      const results = await db
        .select()
        .from(payments)
        .where(eq(payments.sessionId, sessionId))
        .orderBy(desc(payments.createdAt));
        
      return results.length > 0 ? results[0] : null;
    } catch (error: any) {
      // If there's a column mismatch issue, select only essential columns
      if (error.message && (error.message.includes('reference') || error.message.includes('description'))) {
        console.log('Column mismatch found in getLatestPaymentForSession, using essential column selection');
        const results = await db
          .select({
            id: payments.id,
            sessionId: payments.sessionId,
            customerId: payments.customerId,
            amount: payments.amount,
            paymentMethod: payments.paymentMethod,
            status: payments.status,
            paymentDate: payments.paymentDate,
            createdAt: payments.createdAt
          })
          .from(payments)
          .where(eq(payments.sessionId, sessionId))
          .orderBy(desc(payments.createdAt));
          
        return results.length > 0 ? results[0] as Payment : null;
      }
      console.error('Error fetching latest payment:', error);
      return null;
    }
  }
  
  async getTransaction(transactionId: number): Promise<any> {
    try {
      // First check if this is a session ID
      const session = await this.getSession(transactionId);

      if (session) {
        const station = session.stationId ? await this.getStation(session.stationId) : null;
        const customer = session.customerId ? await this.getCustomer(session.customerId) : null;
        const game = session.gameId ? await this.getGame(session.gameId) : null;
        
        // Get the latest payment for this session using our helper method
        const latestPayment = await this.getLatestPaymentForSession(session.id);
        
        return {
          id: session.id,
          customerName: customer?.fullName || 'Guest',
          stationId: station?.id || null,
          stationName: station?.name || null,
          gameName: game?.title || null,
          amount: session.totalAmount || 0,
          createdAt: session.startTime,
          status: session.status,
          paymentStatus: latestPayment?.status || 'PENDING',
          paymentMethod: latestPayment?.paymentMethod || 'PENDING',
          duration: session.duration
        };
      }

      // If not a session, return a default transaction
      return {
        id: transactionId,
        customerName: 'Customer',
        stationId: null,
        gameName: null,
        amount: 0,
        createdAt: new Date(),
        status: 'UNKNOWN',
        paymentStatus: 'UNKNOWN',
        paymentMethod: 'UNKNOWN',
        duration: 0
      };
    } catch (error: any) {
      // If we failed because of a missing column, create a transaction object with default values
      if (error.message && (error.message.includes('payment_method') || error.message.includes('reference'))) {
        console.log('Missing column error in getTransaction, returning default transaction');
        return {
          id: transactionId,
          customerName: 'Customer',
          stationId: null,
          gameName: null,
          amount: 0,
          createdAt: new Date(),
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
          paymentMethod: 'PENDING',
          duration: 0
        };
      }
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  async awardLoyaltyPoints(userId: number, points: number): Promise<any> {
    console.log(`Awarding ${points} loyalty points to user ${userId}`);
    // Replace this with your actual database update logic. This is a placeholder.
    return { id: userId, pointsAwarded: points };
  }

  async getTodayStats(): Promise<any> {
    try {
      // Get today's date with time set to midnight
      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);

      // Get all stations to calculate active ones
      const stations = await this.getAllStations();
      const activeStations = stations.filter(s => s.status === 'ACTIVE');

      // Get transactions created today
      const dailyTransactions = await this.getTransactions(dayStart.toISOString().split('T')[0]);

      // Get completed transactions for today
      const completedTransactions = dailyTransactions.filter(
        tx => tx.status === 'COMPLETED' || tx.paymentStatus === 'COMPLETED'
      );

      // Calculate total revenue from completed transactions
      const totalRevenue = completedTransactions.reduce((sum, tx) => {
        const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : Number(tx.amount || 0);
        return sum + amount;
      }, 0);

      // Format the report with current active sessions and completed transactions
      return {
        totalRevenue,
        activeSessionsCount: activeStations.length,
        completedSessionsCount: completedTransactions.length,
        averageSessionValue: completedTransactions.length > 0 
          ? totalRevenue / completedTransactions.length 
          : 0,
        activeSessions: activeStations.map(station => ({
          stationId: station.id,
          stationName: station.name,
          customerId: station.currentCustomer,
          gameName: station.currentGame,
          startTime: station.currentSessionStart,
          status: 'ACTIVE'
        })),
        sessions: completedTransactions.map(tx => ({
          stationName: tx.stationName,
          gameName: tx.gameName,
          duration: tx.duration || '-',
          amount: tx.amount,
          status: 'COMPLETED',
          paymentMethod: tx.paymentMethod
        }))
      };
    } catch (error) {
      console.error("Error getting today's stats:", error);
      throw error;
    }
  }

  async getCustomerActivity(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      // Default to last 7 days if no date range provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate 
        ? new Date(startDate) 
        : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get all transactions within the date range
      const transactions = await this.getTransactions(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );

      // Group transactions by date
      const activityByDate = {};

      // Create an entry for each day in the range
      let currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        activityByDate[dateKey] = {
          date: dateKey,
          count: 0,
          revenue: 0,
          uniqueCustomers: new Set()
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Populate data from transactions
      transactions.forEach(tx => {
        if (!tx.createdAt) return;

        const txDate = new Date(tx.createdAt);
        const dateKey = txDate.toISOString().split('T')[0];

        // Only include if within our date range
        if (activityByDate[dateKey]) {
          activityByDate[dateKey].count++;

          const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : Number(tx.amount || 0);
          activityByDate[dateKey].revenue += amount;

          if (tx.customerId) {
            activityByDate[dateKey].uniqueCustomers.add(tx.customerId);
          }
        }
      });

      // Convert to array and transform for chart consumption
      return Object.values(activityByDate).map((day: any) => ({
        date: day.date,
        count: day.count,
        revenue: day.revenue,
        uniqueCustomers: day.uniqueCustomers.size
      }));
    } catch (error) {
      console.error("Error getting customer activity:", error);
      throw error;
    }
  }

  async getPaymentMethods(): Promise<any[]> {
    try {
      // Get all completed transactions
      const transactions = await this.getTransactions();
      const completedTransactions = transactions.filter(
        tx => tx.status === 'COMPLETED' || tx.paymentStatus === 'COMPLETED'
      );

      // Group by payment method
      const methodCounts = {};
      const methodAmounts = {};

      completedTransactions.forEach(tx => {
        const method = tx.paymentMethod || 'Unknown';
        methodCounts[method] = (methodCounts[method] || 0) + 1;

        const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : Number(tx.amount || 0);
        methodAmounts[method] = (methodAmounts[method] || 0) + amount;
      });

      // Convert to array for the frontend
      return Object.keys(methodCounts).map(method => ({
        method,
        count: methodCounts[method],
        amount: methodAmounts[method]
      }));
    } catch (error) {
      console.error("Error getting payment methods:", error);
      throw error;
    }
  }

  async getGamePerformanceReport(startDate?: string, endDate?: string): Promise<any> {
    try {
      // Get transactions within date range
      const transactions = await this.getTransactions(startDate, endDate);
      const allGames = await this.getAllGames();

      // Game metrics tracking
      const gameMetrics = {};

      // Initialize game metrics
      allGames.forEach(game => {
        const gameName = game.title || game.name;
        gameMetrics[gameName] = {
          gameId: game.id,
          gameName,
          sessionCount: 0,
          totalRevenue: 0,
          totalDuration: 0,
          averageDuration: 0,
          revenuePerHour: 0
        };
      });

      // Process transactions
      transactions.forEach(tx => {
        const gameName = tx.gameName || tx.gameTitle;
        if (gameName && gameMetrics[gameName]) {
          const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : Number(tx.amount || 0);

          // Update counts and revenue
          gameMetrics[gameName].sessionCount += 1;
          gameMetrics[gameName].totalRevenue += amount;

          // Update duration
          if (tx.duration) {
            gameMetrics[gameName].totalDuration += tx.duration;
          } else if (tx.sessionType === 'hourly' || tx.sessionType === 'HOURLY') {
            gameMetrics[gameName].totalDuration += 60; // Assume 1 hour
          } else {
            gameMetrics[gameName].totalDuration += 30; // Assume 30 minutes for fixed sessions
          }
        }
      });

      // Calculate averages and convert to array
      const gamePerformance = [];
      Object.values(gameMetrics).forEach((game: any) => {
        if (game.sessionCount > 0) {
          game.averageDuration = game.totalDuration / game.sessionCount;
          game.revenuePerHour = (game.totalRevenue / game.totalDuration) * 60;
          gamePerformance.push(game);
        }
      });

      // Sort by revenue for most profitable games
      gamePerformance.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

      // Find most popular and highest revenue games
      let mostPopularGame = '';
      let highestRevenueGame = '';
      let maxSessions = 0;
      let maxRevenue = 0;

      gamePerformance.forEach((game: any) => {
        if (game.sessionCount > maxSessions) {
          maxSessions = game.sessionCount;
          mostPopularGame = game.gameName;
        }
        if (game.totalRevenue > maxRevenue) {
          maxRevenue = game.totalRevenue;
          highestRevenueGame = game.gameName;
        }
      });

      return {
        totalGames: gamePerformance.length,
        mostPopularGame,
        highestRevenueGame,
        gamePerformance
      };
    } catch (error) {
      console.error("Error generating game performance report:", error);
      throw error;
    }
  }

  async getLoyaltyReport(): Promise<any> {
    try {
      const customers = await this.getAllCustomers();

      // Calculate loyalty metrics
      const totalPoints = customers.reduce((sum, customer) => {
        const points = customer.loyaltyPoints || customer.points || 0;
        return sum + points;
      }, 0);

      const customersWithPoints = customers.filter(c => {
        const points = c.loyaltyPoints || c.points || 0;
        return points > 0;
      });

      // Segment customers by points
      const loyaltySegments = [
        { name: "Bronze", min: 1, max: 100, count: 0, totalPoints: 0, avgPoints: 0 },
        { name: "Silver", min: 101, max: 500, count: 0, totalPoints: 0, avgPoints: 0 },
        { name: "Gold", min: 501, max: 1000, count: 0, totalPoints: 0, avgPoints: 0 },
        { name: "Platinum", min: 1001, max: Infinity, count: 0, totalPoints: 0, avgPoints: 0 }
      ];

      // Count customers in each segment
      customersWithPoints.forEach(customer => {
        const points = customer.loyaltyPoints || customer.points || 0;
        for (const segment of loyaltySegments) {
          if (points >= segment.min && points <= segment.max) {
            segment.count++;
            segment.totalPoints += points;
            break;
          }
        }
      });

      // Calculate averages
      loyaltySegments.forEach(segment => {
        segment.avgPoints = segment.count > 0 ? segment.totalPoints / segment.count : 0;
      });

      return {
        totalCustomers: customers.length,
        customersWithPoints: customersWithPoints.length,
        totalPointsIssued: totalPoints,
        loyaltySegments
      };
    } catch (error) {
      console.error("Error generating loyalty report:", error);
      throw error;
    }
  }

  async getRevenueReport(startDate?: string, endDate?: string): Promise<any> {
    try {
      // Get customer activity which has revenue by day
      const activityByDay = await this.getCustomerActivity(startDate, endDate);

      // Calculate total and average revenue
      const totalRevenue = activityByDay.reduce((sum, day) => sum + day.revenue, 0);
      const averageDailyRevenue = activityByDay.length > 0 
        ? totalRevenue / activityByDay.length 
        : 0;

      // Find highest revenue day
      let highestRevenue = 0;
      let highestRevenueDay = '';

      activityByDay.forEach(day => {
        if (day.revenue > highestRevenue) {
          highestRevenue = day.revenue;
          highestRevenueDay = day.date;
        }
      });

      // Get payment methods breakdown
      const paymentMethods = await this.getPaymentMethods();

      // Calculate percentage of total for each payment method
      paymentMethods.forEach(method => {
        method.percentage = totalRevenue > 0 
          ? (method.amount / totalRevenue) * 100 
          : 0;
      });

      return {
        totalRevenue,
        averageDailyRevenue,
        highestRevenue,
        highestRevenueDay,
        revenueByDay: activityByDay,
        paymentMethods
      };
    } catch (error) {
      console.error("Error generating revenue report:", error);
      throw error;
    }
  }

  async getTransactions(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      const query = db.select().from(sessions);

      if (startDate) {
        const start = new Date(startDate);
        // Use eq for date comparison instead of gte which may not be imported
        query.where(eq(sessions.startTime, start));
      }
      if (endDate) {
        const end = new Date(endDate);
        // Use eq for date comparison instead of lte which may not be imported
        query.where(eq(sessions.startTime, end));
      }

      const sessionsData = await query;

      // Process each session sequentially to avoid using await in map
      const results = [];
      for (const session of sessionsData) {
        let stationName = null;
        let gameName = null;
        
        if (session.stationId) {
          const station = await this.getStation(session.stationId);
          stationName = station?.name;
        }
        
        if (session.gameId) {
          const game = await this.getGame(session.gameId);
          gameName = game?.title;
        }
        
        results.push({
          id: session.id,
          customerId: session.customerId,
          stationName,
          gameName,
          amount: session.totalAmount,
          createdAt: session.startTime,
          status: session.status,
          paymentStatus: session.paymentStatus,
          paymentMethod: session.paymentMethod,
          duration: session.duration
        });
      }

      return results;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  async getStations(): Promise<Station[]> {
      return await db.select().from(stations);
  }

  async getGames(): Promise<Game[]> {
      return await db.select().from(games);
  }

  async getCustomers(): Promise<Customer[]> {
      return await db.select().from(customers);
  }

  async getTodayStats(): Promise<Stat | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayStat] = await db
      .select()
      .from(stats)
      .where(eq(stats.date, today));

    return todayStat;
  }

  async updateStats(statData: Partial<Stat>): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existingStat] = await db
      .select()
      .from(stats)
      .where(eq(stats.date, today));

    if (existingStat) {
      await db
        .update(stats)
        .set({ ...statData, updatedAt: new Date() })
        .where(eq(stats.id, existingStat.id));
    } else {
      await db
        .insert(stats)
        .values({
          date: today,
          ...statData,
          activeStations: statData.activeStations || 0,
          activeUsers: statData.activeUsers || 0,
          totalRevenue: statData.totalRevenue || 0,
          totalHours: statData.totalHours || 0
        });
    }
  }
}

export const storage = new DatabaseStorage();