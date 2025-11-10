# SKLLZ Twitter Bot - Automated NFT Sales & Promotion

A production-ready Twitter bot built with [Bun](https://bun.sh) and TypeScript for automated NFT artist promotion. Features AI-generated thank-you tweets for sales and weekly promotional threads.

## ✨ Features

- 🚀 **Lightning Fast** - Powered by Bun runtime
- 📝 **Fully Typed** - TypeScript for type safety
- 🤖 **AI-Powered Tweets** - OpenAI o3-mini generates authentic, varied content
- 🔄 **Dynamic Scheduling** - Database-backed cron scheduling with CLI management
- 🧵 **Thread Support** - Automated weekly shill threads with intro + 5 latest works
- 🎨 **NFT Marketplace Integration** - Syncs with objkt.com and TzKT APIs
- 🗄️ **PostgreSQL Backend** - Tracks sales, tokens, and schedules
- 🔒 **Concurrency Protection** - PostgreSQL advisory locks prevent duplicate runs
- ♻️ **Retry Logic** - Exponential backoff for Twitter API reliability
- 📊 **Sales Tracking** - Thank-you tweets for listing sales and mint sales
- ⚡ **Modern API** - Uses Twitter API v2

## 🎨 Supported NFT Types

The bot currently tracks and promotes three types of Tezos NFTs from objkt.com:

### 1. Standard Tokens (1/1s and Limited Editions)

- Unique pieces or limited edition tokens with active listings
- Automatically tracked when listed on objkt.com
- Example: Single artworks, small edition series

### 2. Open Editions

- Unlimited mints available for a set period
- Each mint triggers a thank-you tweet to the collector
- Ideal for accessible, widely-distributed works

### 3. Generative Collections (editart)

- Algorithmic art collections where each mint is unique
- Supports editart-style generative projects
- Each minted token tracked individually
- Perfect for long-tail generative drops

**Want to add support for other marketplaces or NFT types?** See the [Extending the Bot](#-extending-the-bot) section below.

## 📋 Prerequisites

Before you begin, ensure you have:

- [Bun](https://bun.sh) installed (v1.0.0 or higher)
- Node.js 18+ (as fallback)
- A Twitter Developer Account with API v2 access
- Twitter API credentials (API Key, API Secret, Access Token, Access Secret)
- PostgreSQL database (Neon, AWS RDS, or local)
- OpenAI API key (for AI-generated tweets)
- Tezos wallet address(es) to track

## 🔑 Getting Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new App (or use an existing one)
3. Navigate to "Keys and Tokens"
4. Generate/copy the following:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret
5. Ensure your app has **Read and Write** permissions

## 🗄️ Setting Up Database

This bot uses PostgreSQL to track NFT sales, tokens, and schedules.

**Need a database?** We recommend [Neon](https://neon.tech) - a free serverless PostgreSQL platform.

👉 **[See detailed Neon setup guide](./docs/NEON_SETUP.md)** for step-by-step instructions on creating a free database and getting your connection string.

### Initialize Database Schema

Run the migration script to create all required tables:

```bash
bun run migrate
```

This creates:

- `tokens` - NFT token data synced from objkt.com
- `nft_sales` - Sales tracking with buyer information
- `schedules` - Dynamic cron schedules for automation

## 🚀 Quick Start

### 1. Clone or Download

```bash
git clone <your-repo-url>
cd skllz-twitter-bot
```

### 2. Install Dependencies

```bash
bun install
```

Or with npm:

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Twitter API Credentials
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here

# Database Configuration
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=o3-mini

# Objkt GraphQL API
OBJKT_GRAPHQL_ENDPOINT=https://data.objkt.com/v3/graphql

# TzKT REST API
TZKT_API_URL=https://api.tzkt.io

# Wallet Addresses (comma-separated list)
WALLET_ADDRESSES=tz1YourWalletAddress

# Bot Configuration
BOT_ENABLED=true
BOT_INTERVAL_MINUTES=60
BOT_DEBUG=false
```

### 4. Initialize Database

Run the migration to create all required tables:

```bash
bun run migrate
```

### 5. Sync NFT Data

```bash
# Dry run to test
bun run sync:dry-run

# Actual sync
bun run sync
```

### 6. Mark Historical Sales as Processed

**Important:** After your first sync, mark all existing sales as processed to prevent the bot from thanking people for every historical sale:

```bash
bun run mark-processed
```

This ensures the bot only sends thank-you tweets for new sales going forward. You can skip this step if you want to thank people for all historical sales (not recommended for large catalogs).

### 7. Set Up Schedules

```bash
# Thank-you tweets every hour
bun run schedule add thank "0 * * * *" America/New_York

# Shill thread every Tuesday at noon
bun run schedule add shill "0 12 * * 2" America/New_York

# List all schedules
bun run schedule list
```

### 8. Start the Bot

```bash
# Start scheduler (production)
bun run start

# Test connections only
bun run test
```

## 📖 Bot Functionality

### Thank-You Tweets

Automatically generates and posts thank-you tweets when NFTs are sold:

```bash
# Test in dry-run mode
bun run thank:dry-run

# Post thank-you tweets
bun run thank
```

**How it works:**

1. Syncs latest sales from objkt.com and TzKT
2. Fetches unprocessed sales from database
3. Batches sales by token (groups multiple buyers)
4. Generates AI tweet with OpenAI o3-mini
5. Posts tweet and marks sales as processed

### Weekly Shill Thread

Posts a promotional thread every Tuesday with your latest 5 artworks:

```bash
# Test in dry-run mode
bun run shill:dry-run

# Post shill thread
bun run shill
```

**Thread structure:**

1. Intro tweet with #TEZOSTUESDAY hashtag
2. Five token tweets (latest works by timestamp)
3. Each tweet includes title, description, and URL

### Customizing AI Prompts

All OpenAI prompts are centralized in `src/prompts.ts` for easy customization:

```typescript
// src/prompts.ts
export const prompts = {
  thankYou: {
    system: `Your system prompt here...`,
    user: (tokenName, buyers, url) => `Your user prompt...`
  },
  shillIntro: { ... },
  shillToken: { ... }
}
```

**To customize:**

1. Edit `src/prompts.ts` with your preferred voice and style
2. Test changes with dry-run commands:
   ```bash
   bun run thank:dry-run
   bun run shill:dry-run
   ```
3. Commit your customized prompts to version control

**Tips for editing prompts:**

- Keep tweets under 280 characters
- Be specific about tone and style
- Avoid overused phrases or generic language
- Test thoroughly before production use

### Schedule Management

```bash
# Add a schedule
bun run schedule add <type> <cron_pattern> [timezone]

# Examples:
bun run schedule add thank "0 * * * *" UTC              # Every hour
bun run schedule add shill "0 12 * * 2" America/New_York # Tuesdays at noon

# List all schedules
bun run schedule list

# Enable/disable schedules
bun run schedule enable <id>
bun run schedule disable <id>

# Remove a schedule
bun run schedule remove <id>
```

### Data Sync

Manually sync NFT data from blockchain:

```bash
# Dry run (no database changes)
bun run sync:dry-run

# Full sync
bun run sync
```

### Mark Sales as Processed

Manually mark all sales as processed (useful for testing):

```bash
bun run mark-processed
```

## 🛠️ Configuration

### Environment Variables

| Variable                 | Required | Default                             | Description                                  |
| ------------------------ | -------- | ----------------------------------- | -------------------------------------------- |
| `TWITTER_API_KEY`        | ✅ Yes   | -                                   | Your Twitter API Key                         |
| `TWITTER_API_SECRET`     | ✅ Yes   | -                                   | Your Twitter API Secret                      |
| `TWITTER_ACCESS_TOKEN`   | ✅ Yes   | -                                   | Your Access Token                            |
| `TWITTER_ACCESS_SECRET`  | ✅ Yes   | -                                   | Your Access Token Secret                     |
| `TWITTER_BEARER_TOKEN`   | ❌ No    | -                                   | Bearer token (optional, for read operations) |
| `DATABASE_URL`           | ✅ Yes   | -                                   | PostgreSQL connection string                 |
| `OPENAI_API_KEY`         | ✅ Yes   | -                                   | OpenAI API key for tweet generation          |
| `OPENAI_MODEL`           | ❌ No    | `o3-mini`                           | OpenAI model (use o3-mini for reasoning)     |
| `OBJKT_GRAPHQL_ENDPOINT` | ❌ No    | `https://data.objkt.com/v3/graphql` | Objkt GraphQL API endpoint                   |
| `TZKT_API_URL`           | ❌ No    | `https://api.tzkt.io`               | TzKT REST API URL                            |
| `WALLET_ADDRESSES`       | ✅ Yes   | -                                   | Comma-separated Tezos wallet addresses       |
| `BOT_ENABLED`            | ❌ No    | `true`                              | Enable/disable the bot                       |
| `BOT_INTERVAL_MINUTES`   | ❌ No    | `60`                                | Legacy interval (use schedules instead)      |
| `BOT_DEBUG`              | ❌ No    | `false`                             | Enable debug logging                         |

## 📁 Project Structure

```plaintext
skllz-twitter-bot/
├── src/
│   ├── index.ts              # Main scheduler entry point
│   ├── config.ts             # Configuration loader
│   ├── db.ts                 # Database connection pool
│   ├── sync.ts               # NFT data sync from objkt/TzKT
│   ├── thank-you.ts          # Thank-you tweet automation
│   ├── shill-thread.ts       # Weekly shill thread automation
│   ├── schedule.ts           # Schedule management CLI
│   ├── mark-processed.ts     # Utility to mark sales processed
│   ├── openai.ts             # OpenAI client
│   ├── objkt.ts              # Objkt GraphQL connector
│   ├── tzkt.ts               # TzKT REST connector
│   ├── queries.ts            # GraphQL queries
│   ├── transformers.ts       # Data transformation
│   └── utils/
│       ├── logger.ts         # Logging utility
│       └── locks.ts          # PostgreSQL advisory locks
├── migrations/
│   └── 001_create_schedules.sql # Database schema
├── .env.example              # Example environment variables
├── .gitignore                # Git ignore file
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## 🧪 Development

### Type Checking

```bash
bun run type-check
```

### Build

```bash
bun run build
```

## 📝 Scripts

**Main Commands:**

- `bun run start` - Start the scheduler (production)
- `bun run test` - Test all API connections
- `bun run dev` - Development mode with auto-reload

**Data Sync:**

- `bun run sync` - Sync NFT data from blockchain
- `bun run sync:dry-run` - Test sync without database changes

**Tweet Automation:**

- `bun run thank` - Process thank-you tweets
- `bun run thank:dry-run` - Test thank-you tweets
- `bun run shill` - Post weekly shill thread
- `bun run shill:dry-run` - Test shill thread

**Schedule Management:**

- `bun run schedule add <type> <pattern> [tz]` - Add schedule
- `bun run schedule list` - List all schedules
- `bun run schedule enable <id>` - Enable schedule
- `bun run schedule disable <id>` - Disable schedule
- `bun run schedule remove <id>` - Remove schedule

**Utilities:**

- `bun run mark-processed` - Mark all sales as processed
- `bun run build` - Build TypeScript project
- `bun run type-check` - Check TypeScript types

## 🔒 Security Best Practices

1. **Never commit your `.env` file** - It's already in `.gitignore`
2. **Rotate your API keys regularly**
3. **Use environment variables** for all sensitive data
4. **Enable 2FA** on your Twitter Developer account
5. **Monitor your API usage** in the Twitter Developer Portal

## 📚 API Documentation

This bot uses the [twitter-api-v2](https://github.com/plhery/node-twitter-api-v2) library. For more advanced usage, check out:

- [twitter-api-v2 Documentation](https://github.com/plhery/node-twitter-api-v2/tree/master/doc)
- [Twitter API v2 Reference](https://developer.twitter.com/en/docs/twitter-api)

## 🐛 Troubleshooting

### "Missing required environment variable" error

Make sure you've created a `.env` file and filled in all required credentials (Twitter, OpenAI, Database, Wallet).

### "Invalid or expired token" error

1. Verify your API credentials are correct
2. Check that your Twitter app has **Read and Write** permissions
3. Try regenerating your access tokens

### No schedules running

1. Check schedules exist: `bun run schedule list`
2. Verify schedules are enabled
3. Check cron patterns are valid
4. Ensure scheduler is running: `bun run start`

### No sales detected

1. Verify `WALLET_ADDRESSES` is correct
2. Run sync manually: `bun run sync`
3. Check database has `nft_sales` table
4. Verify wallet has sales on objkt.com

### OpenAI errors

1. Verify `OPENAI_API_KEY` is valid
2. Use `o3-mini` model (not gpt-4o)
3. Check OpenAI account has credits

### Database connection issues

1. Test connection: `psql "$DATABASE_URL"`
2. Run migration: `cat migrations/001_create_schedules.sql | psql "$DATABASE_URL"`
3. Check SSL mode in connection string

## 🔧 Extending the Bot

The bot is designed to be extensible. Here's how to add new functionality:

### Adding a New Tweet Type

Want to add birthday tweets, milestone celebrations, or other automated posts?

1. **Create a new prompt** in `src/prompts.ts`:

   ```typescript
   export const prompts = {
     // ... existing prompts
     milestone: {
       system: `You are writing celebration tweets for NFT milestones...`,
       user: (milestone, count) =>
         `Celebrate reaching ${count} ${milestone}...`,
     },
   };
   ```

2. **Create the automation file** `src/milestone-tweet.ts`:

   ```typescript
   export async function processMilestoneTweet(dryRun = false): Promise<void> {
     // Your logic here
     if (dryRun) {
       logger.info('[DRY RUN] Would post milestone tweet');
       return;
     }
     // Post to Twitter
   }

   if (import.meta.main) {
     const dryRun = process.argv.includes('--dry-run');
     processMilestoneTweet(dryRun);
   }
   ```

3. **Add scripts** to `package.json`:

   ```json
   "milestone": "bun run src/milestone-tweet.ts",
   "milestone:dry-run": "bun run src/milestone-tweet.ts --dry-run"
   ```

4. **Enable scheduling** by updating `Schedule['type']` in `src/index.ts` and adding a case to `executeSchedule()`

### Adding Support for New NFT Marketplaces

Currently supports objkt.com. To add fxhash, versum, or other marketplaces:

1. **Create API client** (e.g., `src/fxhash.ts`):

   ```typescript
   export function createFxhashClient(): GraphQLClient {
     return new GraphQLClient('https://api.fxhash.xyz/graphql');
   }

   export async function getFxhashTokens(client, wallets) {
     // GraphQL query
   }
   ```

2. **Add transformers** in `src/transformers.ts`:

   ```typescript
   export function transformFxhashToken(token: any) {
     return {
       token_id: token.id,
       fa_contract: token.contract,
       // ... map to common structure
     };
   }
   ```

3. **Update sync logic** in `src/sync.ts`:
   ```typescript
   export async function syncObjktData(dryRun = false) {
     // ... existing objkt sync

     // Add fxhash sync
     const fxhashClient = createFxhashClient();
     const fxhashTokens = await getFxhashTokens(fxhashClient, wallets);
     for (const token of fxhashTokens) {
       const transformed = transformFxhashToken(token);
       await upsertToken(transformed, dryRun);
     }
   }
   ```

### Customizing AI Prompts

All prompts live in `src/prompts.ts` for easy customization:

```typescript
export const prompts = {
  thankYou: {
    system: `Customize your bot's personality here...`,
    user: (tokenName, buyers, url) => `Template with ${tokenName}...`,
  },
};
```

**Tips for great prompts:**

- Keep tweets under 280 characters (mention in system prompt)
- Be specific about tone and voice
- Avoid clichés and overused phrases
- Test with `--dry-run` before production
- Use template literals for dynamic content

### Adding New GraphQL Queries

Need more data from objkt.com?

1. **Add query** to `src/objkt.ts`:

   ```typescript
   export async function getCollaborations(client, wallets) {
     const query = `
       query GetCollabs($wallets: [String!]) {
         token(where: {creators: {creator_address: {_in: $wallets}}}) {
           # ... fields
         }
       }
     `;
     return await client.request(query, { wallets });
   }
   ```

2. **Create transformer** in `src/transformers.ts`
3. **Integrate** into `syncObjktData()` in `src/sync.ts`

## 📄 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

Built with ❤️ using [Bun](https://bun.sh) and [twitter-api-v2](https://github.com/plhery/node-twitter-api-v2)
