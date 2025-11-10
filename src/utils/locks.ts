import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Acquire a PostgreSQL advisory lock for a schedule
 * @param scheduleId The schedule ID to lock
 * @returns true if lock was acquired, false otherwise
 */
export async function acquireLock(scheduleId: number): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT pg_try_advisory_lock($1) as acquired',
      [scheduleId]
    );
    return result.rows[0].acquired === true;
  } catch (error) {
    console.error(`Failed to acquire lock for schedule ${scheduleId}:`, error);
    return false;
  }
}

/**
 * Release a PostgreSQL advisory lock for a schedule
 * @param scheduleId The schedule ID to unlock
 * @returns true if lock was released, false otherwise
 */
export async function releaseLock(scheduleId: number): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT pg_advisory_unlock($1) as released',
      [scheduleId]
    );
    return result.rows[0].released === true;
  } catch (error) {
    console.error(`Failed to release lock for schedule ${scheduleId}:`, error);
    return false;
  }
}

/**
 * Release all advisory locks held by this connection
 */
export async function releaseAllLocks(): Promise<void> {
  try {
    await pool.query('SELECT pg_advisory_unlock_all()');
  } catch (error) {
    console.error('Failed to release all locks:', error);
  }
}

/**
 * Get the database pool for cleanup
 */
export function getPool(): Pool {
  return pool;
}
