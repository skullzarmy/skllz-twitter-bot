import 'dotenv/config';

interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
  bearerToken?: string;
}

interface BotConfig {
  enabled: boolean;
  intervalMinutes: number;
  debug: boolean;
}

interface DatabaseConfig {
  url: string;
}

interface OpenAIConfig {
  apiKey: string;
  model: string;
}

interface ObjktConfig {
  graphqlEndpoint: string;
}

interface TzktConfig {
  apiUrl: string;
}

interface WalletConfig {
  addresses: string[];
}

interface Config {
  twitter: TwitterConfig;
  bot: BotConfig;
  database: DatabaseConfig;
  openai: OpenAIConfig;
  objkt: ObjktConfig;
  tzkt: TzktConfig;
  wallets: WalletConfig;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }

  return value;
}

function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];

  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];

  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

export const config: Config = {
  twitter: {
    apiKey: getEnvVar('TWITTER_API_KEY'),
    apiSecret: getEnvVar('TWITTER_API_SECRET'),
    accessToken: getEnvVar('TWITTER_ACCESS_TOKEN'),
    accessSecret: getEnvVar('TWITTER_ACCESS_SECRET'),
    bearerToken: getEnvVar('TWITTER_BEARER_TOKEN', ''),
  },
  bot: {
    enabled: getEnvBool('BOT_ENABLED', true),
    intervalMinutes: getEnvNumber('BOT_INTERVAL_MINUTES', 60),
    debug: getEnvBool('BOT_DEBUG', false),
  },
  database: {
    url: getEnvVar('DATABASE_URL'),
  },
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
    model: getEnvVar('OPENAI_MODEL', 'gpt-4o'),
  },
  objkt: {
    graphqlEndpoint: getEnvVar(
      'OBJKT_GRAPHQL_ENDPOINT',
      'https://data.objkt.com/v3/graphql'
    ),
  },
  tzkt: {
    apiUrl: getEnvVar('TZKT_API_URL', 'https://api.tzkt.io'),
  },
  wallets: {
    addresses: getEnvVar(
      'WALLET_ADDRESSES',
      'tz1Qi77tcJn9foeHHP1QHj6UX1m1vLVLMbuY'
    )
      .split(',')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0),
  },
};
