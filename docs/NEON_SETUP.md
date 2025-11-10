# Setting Up a Free Neon Database

This guide will walk you through creating a free PostgreSQL database on [Neon](https://neon.tech) and getting your connection string for the SKLLZ Twitter Bot.

## Why Neon?

Neon is a serverless PostgreSQL platform that offers:

- **Free Tier** - Generous free plan with 0.5 GB storage and 100 hours of compute per month
- **Instant Setup** - Database ready in seconds
- **No Credit Card Required** - Start building immediately
- **Branching** - Create database branches like git for development
- **Autoscaling** - Compute automatically scales to zero when not in use

## Step-by-Step Setup

### 1. Sign Up for Neon

1. Visit [console.neon.tech/signup](https://console.neon.tech/signup)
2. Sign up with your email, GitHub, Google, or another account
3. No credit card required for the free tier

### 2. Create Your Project

After signing up, you'll be guided through onboarding:

1. **Choose a project name** - Use something descriptive like "skllz-twitter-bot"
2. **Select a region** - Choose the region closest to your deployment (e.g., US East for US-based apps)
3. **Neon creates two branches for you:**
   - `production` - Your main database (1-4 CU compute)
   - `development` - For local development (0.25-1 CU compute)

### 3. Get Your Connection String

1. From your Project Dashboard, click the **Connect** button
2. Select your branch (use `production` for the bot)
3. Select the database (`neondb` is created by default)
4. Select the role (default: `neondb_owner`)
5. **Toggle "Pooled connection" ON** (recommended for better performance)
6. Copy the connection string

Your connection string will look like this:

```
postgresql://neondb_owner:AbC123dEf@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 4. Add to Your `.env` File

Copy the connection string to your `.env` file:

```env
DATABASE_URL=postgresql://neondb_owner:AbC123dEf@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Important:** Add `&channel_binding=require` to the end of the connection string for enhanced security.

### 5. Initialize Your Database

Run the migration to create all required tables:

```bash
bun run migrate
```

This creates:

- `tokens` - NFT token data
- `nft_sales` - Sales tracking
- `schedules` - Cron schedules

### 6. Verify Connection

Test that everything is connected:

```bash
bun run test
```

You should see successful connection messages for all services.

## Understanding Your Connection String

```
postgresql://neondb_owner:password@hostname-pooler.region.aws.neon.tech/neondb?sslmode=require
           ↑           ↑         ↑                                          ↑
           role        password  hostname (includes compute ID)              database
```

**Key components:**

- **Role**: `neondb_owner` (default admin role)
- **Password**: Auto-generated, shown only once
- **Hostname**: Includes your compute ID (e.g., `ep-cool-darkness-123456`)
- **-pooler**: Connection pooling enabled (handles more concurrent connections)
- **Database**: `neondb` (default database name)
- **sslmode=require**: SSL/TLS encryption required

## Tips

### Save Your Password

Your password is shown only once during creation. To retrieve it later:

1. Click **Connect** in your Project Dashboard
2. The connection string includes your password
3. Consider using [1Password](https://1password.com/) - Neon has direct integration to save credentials

### Using Multiple Environments

Create separate branches for different environments:

```bash
# Install Neon CLI
npm install -g neonctl

# Authenticate
neon auth

# Create a staging branch
neon branches create --name staging --parent production
```

Each branch gets its own connection string, perfect for development/staging/production workflows.

### Monitoring Usage

Check your usage on the [Neon Dashboard](https://console.neon.tech):

- **Storage**: Track your data size (500 MB free tier limit)
- **Compute Hours**: Monitor active database time (100 hours/month free)
- **Autoscaling**: Database automatically pauses when inactive

### Upgrading from Free Tier

If you need more resources:

- **Launch Plan**: $19/month - 10 GB storage, increased compute
- **Scale Plan**: $69/month - 50 GB storage, autoscaling, read replicas
- **Business Plan**: Custom pricing for enterprise needs

## Troubleshooting

### Connection Timeout

If you see connection timeouts:

1. Verify your connection string includes `sslmode=require`
2. Check that `-pooler` is in the hostname for pooled connections
3. Ensure your IP isn't blocked (Neon allows all IPs by default)

### Database Not Found

If the migration fails:

1. Verify the database name in your connection string matches what's in Neon
2. Default database is `neondb` - you can create additional databases from the Neon Console

### Out of Compute Hours

Free tier includes 100 hours/month of active compute:

1. Database auto-scales to zero when inactive (saves compute hours)
2. Check usage in your Neon Dashboard
3. Consider upgrading if you consistently hit limits

## Next Steps

Now that your database is set up:

1. [Run your first sync](../README.md#5-sync-nft-data) to populate NFT data
2. [Set up schedules](../README.md#6-set-up-schedules) for automated tweets
3. [Customize AI prompts](../README.md#customizing-ai-prompts) to match your voice

## Resources

- [Neon Documentation](https://neon.tech/docs)
- [Neon Discord Community](https://discord.gg/92vNTzKDGp)
- [Neon Status Page](https://neonstatus.com/)
- [Connection String Format](https://neon.tech/docs/reference/glossary#connection-string)
