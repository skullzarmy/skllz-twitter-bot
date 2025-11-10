# Twitter Bot - Built with Bun & TypeScript

A modern, fully-typed Twitter bot built with [Bun](https://bun.sh) and TypeScript using the [twitter-api-v2](https://github.com/plhery/node-twitter-api-v2) library.

## ✨ Features

- 🚀 **Lightning Fast** - Powered by Bun runtime
- 📝 **Fully Typed** - TypeScript for type safety
- 🔄 **Scheduled Posting** - Automatic tweet scheduling
- 🧵 **Thread Support** - Post tweet threads easily
- 📷 **Media Upload** - Support for images and videos
- 🛠️ **Configurable** - Easy environment-based configuration
- 📊 **Timeline Access** - Read and interact with your timeline
- ⚡ **Modern API** - Uses Twitter API v2

## 📋 Prerequisites

Before you begin, ensure you have:

- [Bun](https://bun.sh) installed (v1.0.0 or higher)
- Node.js 18+ (as fallback)
- A Twitter Developer Account
- Twitter API credentials (API Key, API Secret, Access Token, Access Secret)

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

This bot uses PostgreSQL (compatible with Neon, AWS RDS, local PostgreSQL, etc.).

### Initialize Schema

```bash
# If using Neon or remote PostgreSQL
psql "postgresql://user:password@host/database?sslmode=require" -f schema.sql

# If using local PostgreSQL
psql -U postgres -d your_database -f schema.sql
```

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

Edit `.env` with your Twitter API credentials:

```env
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here

DATABASE_URL=postgresql://user:password@host/database?sslmode=require

BOT_ENABLED=true
BOT_INTERVAL_MINUTES=60
BOT_DEBUG=false
```

### 4. Initialize Database Schema

```bash
psql "$DATABASE_URL" -f schema.sql
```

### 5. Test Connections

**Development mode (with auto-reload):**

```bash
bun run dev
```

**Test connections (Twitter API + Database):**

```bash
bun test
```

**Run once (single execution):**

```bash
bun start -- --once
```

**Production mode (scheduled):**

```bash
bun start
```

## 📖 Usage Examples

### Post a Simple Tweet

```typescript
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

await client.v2.tweet('Hello, Twitter! 🚀');
```

### Post a Tweet with an Image

```typescript
// Upload media first
const mediaId = await client.v1.uploadMedia('./path/to/image.jpg');

// Post tweet with the media
await client.v2.tweet('Check out this image!', {
  media: { media_ids: [mediaId] },
});
```

### Post a Thread

```typescript
await client.v2.tweetThread([
  'First tweet in the thread 🧵',
  'Second tweet continues here...',
  'Third tweet wraps it up! ✨',
]);
```

### Get Your Timeline

```typescript
const me = await client.v2.me();
const timeline = await client.v2.userTimeline(me.data.id, {
  max_results: 10,
});

for await (const tweet of timeline) {
  console.log(tweet.text);
}
```

## 🛠️ Configuration

### Environment Variables

| Variable                | Required | Default | Description                             |
| ----------------------- | -------- | ------- | --------------------------------------- |
| `TWITTER_API_KEY`       | ✅ Yes   | -       | Your Twitter API Key                    |
| `TWITTER_API_SECRET`    | ✅ Yes   | -       | Your Twitter API Secret                 |
| `TWITTER_ACCESS_TOKEN`  | ✅ Yes   | -       | Your Access Token                       |
| `TWITTER_ACCESS_SECRET` | ✅ Yes   | -       | Your Access Token Secret                |
| `TWITTER_BEARER_TOKEN`  | ❌ No    | -       | Bearer token (for read-only operations) |
| `BOT_ENABLED`           | ❌ No    | `true`  | Enable/disable the bot                  |
| `BOT_INTERVAL_MINUTES`  | ❌ No    | `60`    | How often to post (in minutes)          |
| `BOT_DEBUG`             | ❌ No    | `false` | Enable debug logging                    |

## 📁 Project Structure

```
skllz-twitter-bot/
├── src/
│   ├── index.ts              # Main bot entry point
│   ├── config.ts             # Configuration loader
│   ├── db.ts                 # Database connection pool
│   └── utils/
│       ├── logger.ts         # Logging utility
│       └── tweetGenerator.ts # Tweet content utilities
├── schema.sql                # Database schema
├── .env.example              # Example environment variables
├── .gitignore               # Git ignore file
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
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

- `bun run dev` - Start in development mode with auto-reload
- `bun start` - Start the bot in production mode
- `bun start -- --once` - Run the bot once and exit
- `bun run build` - Build the TypeScript project
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

Make sure you've created a `.env` file and filled in all required credentials.

### "Invalid or expired token" error

1. Verify your API credentials are correct
2. Check that your app has Read and Write permissions
3. Try regenerating your access tokens

### Bot not posting

1. Check `BOT_ENABLED=true` in your `.env`
2. Verify your Twitter account isn't restricted
3. Check the console for error messages

## 📄 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

Built with ❤️ using [Bun](https://bun.sh) and [twitter-api-v2](https://github.com/plhery/node-twitter-api-v2)
