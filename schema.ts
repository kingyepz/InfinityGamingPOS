import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, foreignKey, jsonb, doublePrecision, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Defining enums for type fields
export const stationTypeEnum = pgEnum('station_type', ['PS5', 'XBOX', 'PC', 'VR']);
export const stationStatusEnum = pgEnum('station_status', ['AVAILABLE', 'ACTIVE', 'MAINTENANCE']);
export const sessionStatusEnum = pgEnum('session_status', ['ACTIVE', 'COMPLETED', 'CANCELLED']);
export const sessionTypeEnum = pgEnum('session_type', ['HOURLY', 'FIXED']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'MPESA', 'PENDING']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'COMPLETED', 'FAILED']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default('STAFF'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  loyaltyPoints: integer("loyalty_points").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game stations table
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stationType: stationTypeEnum("station_type").notNull(),
  status: stationStatusEnum("station_status").notNull().default('AVAILABLE'),
  ratePerHour: integer("rate_per_hour").notNull(),
  ratePerGame: integer("rate_per_game"),
  maintenanceReason: text("maintenance_reason"),
  maintenanceEta: text("maintenance_eta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Games table
export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  genre: text('genre'),
  platform: text('platform').notNull(),
  boxArtUrl: text('box_art_url'),
  releaseDate: timestamp('release_date'),
  isPopular: boolean('is_popular').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  gameId: integer("game_id").references(() => games.id),
  sessionType: sessionTypeEnum("session_type").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  status: sessionStatusEnum("session_status").notNull().default('ACTIVE'),
  totalAmount: integer("total_amount"), // in KSh
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status"),
  paymentReference: text("payment_reference"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payments table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => sessions.id),
  customerId: integer('customer_id').references(() => customers.id),
  amount: real('amount').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  status: paymentStatusEnum('payment_status').notNull().default('PENDING'),
  reference: text('reference'),
  mpesaReference: text('mpesa_reference'),
  description: text('description'),
  transactionId: integer('transaction_id'),
  paymentDate: timestamp('payment_date').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// Stats table for analytics
export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull().unique(),
  totalRevenue: integer("total_revenue").default(0),
  totalHours: doublePrecision("total_hours").default(0),
  activeStations: integer("active_stations").default(0),
  activeUsers: integer("active_users").default(0),
  stationUtilization: jsonb("station_utilization"), // JSON data for station type usage
  popularGames: jsonb("popular_games"), // JSON data for most played games
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const stationsRelations = relations(stations, ({ many }) => ({
  sessions: many(sessions),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sessions: many(sessions),
  payments: many(payments),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  station: one(stations, {
    fields: [sessions.stationId],
    references: [stations.id],
  }),
  customer: one(customers, {
    fields: [sessions.customerId],
    references: [customers.id],
  }),
  game: one(games, {
    fields: [sessions.gameId],
    references: [games.id],
  }),
  createdByUser: one(users, {
    fields: [sessions.createdBy],
    references: [users.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  session: one(sessions, {
    fields: [payments.sessionId],
    references: [sessions.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [payments.createdBy],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdSessions: many(sessions),
  createdPayments: many(payments),
}));

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, loyaltyPoints: true });
export const insertStationSchema = createInsertSchema(stations).omit({ id: true, createdAt: true });
export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true, status: true, endTime: true, totalAmount: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, paymentDate: true, status: true });
export const insertStatSchema = createInsertSchema(stats).omit({ id: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Station = typeof stations.$inferSelect;
export type InsertStation = z.infer<typeof insertStationSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Stat = typeof stats.$inferSelect;
export type InsertStat = z.infer<typeof insertStatSchema>;