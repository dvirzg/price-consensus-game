import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function resetDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Resetting database...');
    
    // Drop all tables in reverse order of creation
    await pool.query(`
      DROP TABLE IF EXISTS item_assignments CASCADE;
      DROP TABLE IF EXISTS items CASCADE;
      DROP TABLE IF EXISTS participants CASCADE;
      DROP TABLE IF EXISTS games CASCADE;
    `);
    
    console.log('Database reset completed');
    
    // Run migrations again
    console.log('Running migrations...');
    const migrationSQL = readFileSync(join(__dirname, '0000_initial.sql'), 'utf8');
    await pool.query(migrationSQL);
    console.log('Migrations completed successfully');
    
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run in development
if (process.env.NODE_ENV !== 'production') {
  resetDatabase();
} else {
  console.error('Cannot reset database in production');
  process.exit(1);
} 