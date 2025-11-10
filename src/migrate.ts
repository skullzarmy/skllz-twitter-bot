import { pool } from './db';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    logger.info('Running database schema setup...');

    const schemaPath = path.join(process.cwd(), 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    await pool.query(sql);

    logger.info('✅ Database schema created successfully');
    logger.info('');
    logger.info('Tables created:');
    logger.info('  - tokens (NFT token data)');
    logger.info('  - nft_sales (sales tracking)');
    logger.info('  - schedules (cron schedules)');
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Run: bun run sync');
    logger.info(
      '  2. Add schedules: bun run schedule add thank "0 * * * *" UTC'
    );
    logger.info('  3. Start bot: bun run start');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
