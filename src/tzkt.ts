import { config } from './config';
import { logger } from './utils/logger';

const TZKT_API_URL = config.tzkt.apiUrl;

/**
 * Creates a TzKT REST API client
 */
export function createTzktClient() {
  return {
    baseUrl: TZKT_API_URL,

    async get<T>(endpoint: string): Promise<T> {
      const response = await fetch(`${TZKT_API_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(
          `TzKT API error: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    },
  };
}

/**
 * Tests the TzKT REST API connection
 */
export async function testTzktConnection(): Promise<void> {
  logger.info('Testing TzKT REST API connection...');

  const client = createTzktClient();

  try {
    const head = await client.get<{ level: number; timestamp: string }>(
      '/v1/head'
    );

    logger.info(`✅ TzKT API connection successful`);
    logger.info(`Endpoint: ${TZKT_API_URL}`);
    logger.info(`Current block level: ${head.level}`);
    logger.info(`Block timestamp: ${head.timestamp}`);
  } catch (error) {
    logger.error(
      `❌ TzKT API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}
