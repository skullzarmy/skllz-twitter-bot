import { pool } from './db';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    logger.info('Running database migration...');

    const migrationPath = path.join(
      process.cwd(),
      'migrations',
      '001_create_schedules.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(sql);

    logger.info('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
