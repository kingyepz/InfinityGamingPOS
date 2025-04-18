import { pool } from './db';
import { games } from '../shared/schema';

async function migrateGamesTable() {
  console.log('Checking games table columns...');
  
  try {
    // Define columns to check
    const columns = [
      { name: 'description', type: 'TEXT' },
      { name: 'genre', type: 'TEXT' },
      { name: 'platform', type: 'TEXT' },
      { name: 'box_art_url', type: 'TEXT' },
      { name: 'release_date', type: 'TIMESTAMP' },
      { name: 'is_popular', type: 'BOOLEAN' },
      { name: 'is_active', type: 'BOOLEAN' },
      { name: 'updated_at', type: 'TIMESTAMP' }
    ];
    
    // Check and add missing columns
    for (const column of columns) {
      const columnExists = await checkColumnExists('games', column.name);
      
      if (!columnExists) {
        console.log(`Adding ${column.name} column to games table...`);
        // Add column if it doesn't exist
        await pool.query(`ALTER TABLE games ADD COLUMN ${column.name} ${column.type};`);
        console.log(`Successfully added ${column.name} column to games table.`);
      } else {
        console.log(`${column.name} column already exists in games table.`);
      }
    }
    
    console.log('Games table migration completed.');
  } catch (error) {
    console.error('Error migrating games table:', error);
  }
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    );
  `;
  
  const result = await pool.query(query, [tableName, columnName]);
  return result.rows[0].exists;
}

// Run the migration
migrateGamesTable().catch(console.error);