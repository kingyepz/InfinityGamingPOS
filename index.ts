import { Session, Customer, Station, Game, Payment } from "@shared/schema";

export interface SessionWithRelations extends Session {
  customer?: Customer;
  station?: Station;
  game?: Game;
}

export interface PaymentWithRelations extends Payment {
  customer?: Customer;
  session?: Session;
}

export interface StationWithSession extends Station {
  activeSession?: SessionWithRelations;
}

export interface CustomerWithSessions extends Customer {
  sessions?: SessionWithRelations[];
  totalSpent?: number;
  loyaltyPoints?: number;
}

export interface DailyStats {
  date: string;
  activeStations: number;
  activeUsers: number;
  totalHours: number;
  totalRevenue: number;
  stationUtilization?: Record<string, number>;
  popularGames?: Array<{id: number, title: string, count: number}>;
}
