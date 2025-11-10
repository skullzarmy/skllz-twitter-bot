import { Pool } from 'pg';
import { config } from './config';
import { logger } from './utils/logger';

/**
 * PostgreSQL connection pool
 */
export const pool = new Pool({
  connectionString: config.database.url,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    logger.info('✅ Database connected successfully');
    logger.info(`PostgreSQL version: ${result.rows[0]?.version}`);
    logger.info(`Server time: ${result.rows[0]?.current_time}`);
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database pool connections
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}
