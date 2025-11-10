import { Pool } from 'pg';
import { Cron } from 'croner';

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function addSchedule(
  type: 'thank' | 'shill',
  cronPattern: string,
  timezone: string = 'UTC'
): Promise<void> {
  try {
    // Validate cron pattern using Croner
    const job = new Cron(cronPattern, { timezone });
    const nextRun = job.nextRun();
    job.stop();

    if (!nextRun) {
      throw new Error(
        'Invalid cron pattern: unable to determine next run time'
      );
    }

    const result = await pool.query(
      `INSERT INTO schedules (type, cron_pattern, timezone, next_run_at) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [type, cronPattern, timezone, nextRun]
    );

    console.log(`✅ Schedule added successfully (ID: ${result.rows[0].id})`);
    console.log(`   Type: ${type}`);
    console.log(`   Pattern: ${cronPattern}`);
    console.log(`   Timezone: ${timezone}`);
    console.log(`   Next run: ${nextRun.toISOString()}`);
  } catch (error) {
    console.error(
      '❌ Failed to add schedule:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

async function listSchedules(): Promise<void> {
  try {
    const result = await pool.query<Schedule>(
      'SELECT * FROM schedules ORDER BY id ASC'
    );

    if (result.rows.length === 0) {
      console.log('No schedules found');
      return;
    }

    console.log('\n📋 Schedules:');
    console.log('─'.repeat(100));

    for (const schedule of result.rows) {
      const status = schedule.enabled ? '✅' : '⏸️';
      console.log(
        `${status} ID: ${schedule.id} | Type: ${schedule.type.padEnd(6)} | Pattern: ${schedule.cron_pattern.padEnd(20)} | TZ: ${schedule.timezone}`
      );
      console.log(
        `   Last run: ${schedule.last_run_at?.toISOString() || 'Never'}`
      );
      console.log(
        `   Next run: ${schedule.next_run_at?.toISOString() || 'N/A'}`
      );
      console.log('─'.repeat(100));
    }
  } catch (error) {
    console.error(
      '❌ Failed to list schedules:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

async function removeSchedule(id: number): Promise<void> {
  try {
    const result = await pool.query(
      'DELETE FROM schedules WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️  Schedule ID ${id} not found`);
      return;
    }

    console.log(`✅ Schedule ID ${id} removed successfully`);
  } catch (error) {
    console.error(
      '❌ Failed to remove schedule:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

async function enableSchedule(id: number): Promise<void> {
  try {
    const result = await pool.query(
      'UPDATE schedules SET enabled = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️  Schedule ID ${id} not found`);
      return;
    }

    console.log(`✅ Schedule ID ${id} enabled`);
  } catch (error) {
    console.error(
      '❌ Failed to enable schedule:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

async function disableSchedule(id: number): Promise<void> {
  try {
    const result = await pool.query(
      'UPDATE schedules SET enabled = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️  Schedule ID ${id} not found`);
      return;
    }

    console.log(`⏸️  Schedule ID ${id} disabled`);
  } catch (error) {
    console.error(
      '❌ Failed to disable schedule:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'add': {
        const type = args[1] as 'thank' | 'shill';
        const cronPattern = args[2];
        const timezone = args[3] || 'UTC';

        if (!type || !cronPattern) {
          console.error(
            'Usage: bun run schedule add <type> <cron_pattern> [timezone]'
          );
          console.error(
            'Example: bun run schedule add thank "0 * * * *" America/New_York'
          );
          process.exit(1);
        }

        if (type !== 'thank' && type !== 'shill') {
          console.error('Type must be either "thank" or "shill"');
          process.exit(1);
        }

        await addSchedule(type, cronPattern, timezone);
        break;
      }

      case 'list':
        await listSchedules();
        break;

      case 'remove': {
        const id = parseInt(args[1] || '');
        if (Number.isNaN(id)) {
          console.error('Usage: bun run schedule remove <id>');
          process.exit(1);
        }
        await removeSchedule(id);
        break;
      }

      case 'enable': {
        const id = parseInt(args[1] || '');
        if (Number.isNaN(id)) {
          console.error('Usage: bun run schedule enable <id>');
          process.exit(1);
        }
        await enableSchedule(id);
        break;
      }

      case 'disable': {
        const id = parseInt(args[1] || '');
        if (Number.isNaN(id)) {
          console.error('Usage: bun run schedule disable <id>');
          process.exit(1);
        }
        await disableSchedule(id);
        break;
      }

      default:
        console.log('Available commands:');
        console.log(
          '  add <type> <cron_pattern> [timezone] - Add a new schedule'
        );
        console.log(
          '  list                                  - List all schedules'
        );
        console.log(
          '  remove <id>                          - Remove a schedule'
        );
        console.log(
          '  enable <id>                          - Enable a schedule'
        );
        console.log(
          '  disable <id>                         - Disable a schedule'
        );
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
