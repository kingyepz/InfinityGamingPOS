import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;
// We don't configure wsKeepAlive as it's not available in this version
// Instead we'll handle connection status in routes.ts

// Use environment variables for database connection
// Prioritize DATABASE_URL if available, otherwise construct from individual credentials
const DATABASE_URL = process.env.DATABASE_URL || (() => {
  const requiredVars = ['PGUSER', 'PGPASSWORD', 'PGHOST', 'PGDATABASE'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE}`;
})();

if (!DATABASE_URL) {
  throw new Error("Database connection string is not configured. Please check your environment variables.");
}

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });

// Perform a test query to validate the connection
async function testConnection() {
  try {
    // Simple query to test the connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error; // Rethrow to potentially halt the app if DB connection fails
  }
}

// Call test connection asynchronously
testConnection().catch(err => {
  console.error('Database connection failed during startup:', err);
});
