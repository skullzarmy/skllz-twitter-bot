import { TwitterApi } from 'twitter-api-v2';
import { Cron } from 'croner';
import { config } from './config';
import { logger } from './utils/logger';
import { testDatabaseConnection, closeDatabase, pool } from './db';
import { testOpenAIConnection } from './openai';
import { testObjktConnection } from './objkt';
import { testTzktConnection } from './tzkt';
import { processThankYouTweets } from './thank-you';
import { processShillThread } from './shill-thread';
import { acquireLock, releaseLock, releaseAllLocks } from './utils/locks';

interface Schedule {
  id: number;
  type: 'thank' | 'shill';
  cron_pattern: string;
  timezone: string;
  enabled: boolean;
  last_run_at: Date | null;
  next_run_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Initialize Twitter API client with OAuth 1.0a credentials
 */
export function createTwitterClient(): TwitterApi {
  const client = new TwitterApi({
    appKey: config.twitter.apiKey,
    appSecret: config.twitter.apiSecret,
    accessToken: config.twitter.accessToken,
    accessSecret: config.twitter.accessSecret,
  });

  return client;
}

/**
 * Test Twitter API connection
 */
async function testConnection(): Promise<void> {
  logger.info('Testing Twitter API connection...');

  const client = createTwitterClient();

  try {
    const me = await client.v2.me({
      'user.fields': ['created_at', 'description', 'public_metrics'],
    });

    logger.info('✅ Connection successful!');
    logger.info(`User: ${me.data.name} (@${me.data.username})`);
    logger.info(`ID: ${me.data.id}`);
    logger.info(`Created: ${me.data.created_at}`);
    if (me.data.description) {
      logger.info(`Bio: ${me.data.description}`);
    }
    if (me.data.public_metrics) {
      logger.info(
        `Followers: ${me.data.public_metrics.followers_count} | Following: ${me.data.public_metrics.following_count}`
      );
    }

    // Test rate limit info
    await client.v1.rateLimitStatuses();
    logger.info(`✅ Rate limit check successful`);

    // Test database connection
    logger.info('');
    await testDatabaseConnection();

    // Test OpenAI connection
    logger.info('');
    await testOpenAIConnection();

    // Test Objkt API connection
    logger.info('');
    await testObjktConnection();

    // Test TzKT API connection
    logger.info('');
    await testTzktConnection();

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Connection test failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

/**
 * Main bot logic - implement your bot functionality here
 */
async function runBot(): Promise<void> {
  if (!config.bot.enabled) {
    logger.info('Bot is disabled. Set BOT_ENABLED=true to enable.');
    return;
  }

  logger.info('Starting bot...');

  const client = createTwitterClient();

  try {
    // Verify credentials
    const me = await client.v2.me();
    logger.info(`Authenticated as: @${me.data.username}`);

    // TODO: Add your bot logic here
  } catch (error) {
    logger.error('Bot execution failed:', error);
    throw error;
  }
}

/**
 * Load schedules from database
 */
async function loadSchedules(): Promise<Schedule[]> {
  const result = await pool.query<Schedule>(
    'SELECT * FROM schedules WHERE enabled = true ORDER BY id ASC'
  );
  return result.rows;
}

/**
 * Update schedule times in database
 */
async function updateScheduleTimes(
  scheduleId: number,
  lastRunAt: Date,
  nextRunAt: Date | null
): Promise<void> {
  await pool.query(
    'UPDATE schedules SET last_run_at = $1, next_run_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
    [lastRunAt, nextRunAt, scheduleId]
  );
}

/**
 * Execute a schedule with locking
 */
async function executeSchedule(schedule: Schedule): Promise<void> {
  logger.info(`\n🔔 Schedule triggered: ${schedule.type} (ID: ${schedule.id})`);

  // Try to acquire lock
  const lockAcquired = await acquireLock(schedule.id);

  if (!lockAcquired) {
    logger.info(`⏭️  Schedule ${schedule.id} already running, skipping...`);
    return;
  }

  try {
    const now = new Date();

    // Last-run duplicate prevention
    if (schedule.last_run_at) {
      const timeSinceLastRun = now.getTime() - schedule.last_run_at.getTime();
      const minInterval = 60 * 1000; // 1 minute minimum between runs

      if (timeSinceLastRun < minInterval) {
        logger.info(
          `⏭️  Schedule ${schedule.id} ran ${timeSinceLastRun}ms ago, skipping...`
        );
        return;
      }
    }

    // Execute the appropriate function
    if (schedule.type === 'thank') {
      logger.info('Executing thank-you tweet process...');
      await processThankYouTweets(false);
    } else if (schedule.type === 'shill') {
      logger.info('Executing shill thread process...');
      await processShillThread(false);
    }

    // Update last_run_at and calculate next_run_at
    const job = new Cron(schedule.cron_pattern, {
      timezone: schedule.timezone,
    });
    const nextRun = job.nextRun();
    job.stop();

    await updateScheduleTimes(schedule.id, now, nextRun);

    logger.info(`✅ Schedule ${schedule.id} completed successfully`);
    if (nextRun) {
      logger.info(`   Next run: ${nextRun.toISOString()}`);
    }
  } catch (error) {
    logger.error(`❌ Schedule ${schedule.id} failed:`, error);
  } finally {
    // Always release lock
    await releaseLock(schedule.id);
  }
}

/**
 * Start the scheduler
 */
async function startScheduler(): Promise<Cron[]> {
  logger.info('Loading schedules from database...');
  const schedules = await loadSchedules();

  if (schedules.length === 0) {
    logger.info('⚠️  No enabled schedules found');
    logger.info('Use "bun run schedule add <type> <pattern>" to add schedules');
    return [];
  }

  logger.info(`Found ${schedules.length} enabled schedule(s):`);

  const jobs: Cron[] = [];

  for (const schedule of schedules) {
    logger.info(
      `  - ${schedule.type} | ${schedule.cron_pattern} | ${schedule.timezone}`
    );

    const job = new Cron(
      schedule.cron_pattern,
      { timezone: schedule.timezone },
      () => executeSchedule(schedule)
    );

    jobs.push(job);

    const nextRun = job.nextRun();
    if (nextRun) {
      logger.info(`    Next run: ${nextRun.toISOString()}`);
    }
  }

  logger.info('\n✅ Scheduler started');
  return jobs;
}

/**
 * Entry point
 */
async function main(): Promise<void> {
  logger.info('Initializing bot scheduler...');

  const runOnce = process.argv.includes('--once');
  const testMode = process.argv.includes('--test');

  if (testMode) {
    await testConnection();
    return;
  }

  if (runOnce) {
    await runBot();
    process.exit(0);
  } else {
    // Start the scheduler
    await startScheduler();
    logger.info('Scheduler is running. Press Ctrl+C to stop.');
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  closeDatabase().finally(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  closeDatabase().finally(() => process.exit(1));
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await releaseAllLocks();
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await releaseAllLocks();
  await closeDatabase();
  process.exit(0);
});

// Start the bot
main().catch((error) => {
  logger.error('Failed to start bot:', error);
  closeDatabase().finally(() => process.exit(1));
});
