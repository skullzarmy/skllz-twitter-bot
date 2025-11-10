import { pool } from './db';
import { logger } from './utils/logger';

/**
 * Mark all sales as processed
 */
async function markAllSalesProcessed(): Promise<void> {
  try {
    logger.info('Marking all sales as processed...');

    const result = await pool.query(
      'UPDATE nft_sales SET processed = true WHERE processed = false'
    );

    const count = result.rowCount || 0;
    logger.info(`✅ Marked ${count} sales as processed`);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to mark sales as processed:', error);
    process.exit(1);
  }
}

markAllSalesProcessed();
