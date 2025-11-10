import type { TwitterApi } from 'twitter-api-v2';
import type OpenAI from 'openai';
import { pool } from './db';
import { logger } from './utils/logger';
import { createTwitterClient } from './index';
import { createOpenAIClient } from './openai';
import { syncObjktData } from './sync';
import { prompts } from './prompts';

interface TokenForShill {
  name: string;
  description: string;
  token_url: string;
  timestamp: string;
}

/**
 * Fetch the 5 most recent tokens from database
 */
async function getRecentTokens(limit = 5): Promise<TokenForShill[]> {
  const result = await pool.query<TokenForShill>(
    `SELECT name, description, token_url, timestamp 
     FROM tokens 
     ORDER BY timestamp DESC 
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

/**
 * Generate tweet content for a single token using OpenAI
 */
async function generateTokenTweet(
  client: OpenAI,
  token: TokenForShill
): Promise<string | null> {
  try {
    const completion = await client.chat.completions.create({
      model: 'o3-mini',
      messages: [
        { role: 'system', content: prompts.shillToken.system },
        {
          role: 'user',
          content: prompts.shillToken.user(
            token.name,
            token.description,
            token.token_url
          ),
        },
      ],
      max_completion_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error: unknown) {
    logger.error(`OpenAI error for token "${token.name}":`, error);
    return null;
  }
}

/**
 * Generate intro tweet for the thread
 */
async function generateIntroTweet(client: OpenAI): Promise<string | null> {
  try {
    const completion = await client.chat.completions.create({
      model: 'o3-mini',
      messages: [
        { role: 'system', content: prompts.shillIntro.system },
        { role: 'user', content: prompts.shillIntro.user },
      ],
      max_completion_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error: unknown) {
    logger.error('OpenAI error for intro tweet:', error);
    return null;
  }
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        logger.info(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Post a tweet thread
 */
async function postThread(
  client: TwitterApi,
  tweets: string[]
): Promise<boolean> {
  let lastTweetId: string | undefined;

  for (let i = 0; i < tweets.length; i++) {
    try {
      const tweetText = tweets[i];
      if (!tweetText) continue;

      const tweetParams: {
        text: string;
        reply?: { in_reply_to_tweet_id: string };
      } = {
        text: tweetText,
      };

      // If not the first tweet, reply to the previous one
      if (lastTweetId) {
        tweetParams.reply = { in_reply_to_tweet_id: lastTweetId };
      }

      const result = await retryWithBackoff(async () => {
        return await client.v2.tweet(
          tweetParams.text,
          tweetParams.reply ? { reply: tweetParams.reply } : undefined
        );
      });

      lastTweetId = result.data.id;

      logger.info(
        `✅ Posted tweet ${i + 1}/${tweets.length}: ${result.data.id}`
      );

      // Delay between tweets to avoid rate limits (2-3 seconds)
      if (i < tweets.length - 1) {
        const delay = 2000 + Math.random() * 1000; // 2-3s random
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      logger.error(`Failed to post tweet ${i + 1}:`, error);
      return false;
    }
  }

  return true;
}

/**
 * Process and post the weekly shill thread
 */
export async function processShillThread(dryRun = false): Promise<void> {
  logger.info('Starting weekly shill thread process...');

  // Step 1: Sync latest data
  logger.info('Syncing latest NFT data...');
  await syncObjktData(dryRun);
  logger.info('✅ Sync completed');

  // Step 2: Fetch most recent 5 tokens
  logger.info('Fetching 5 most recent tokens...');
  const tokens = await getRecentTokens(5);
  logger.info(`Found ${tokens.length} tokens`);

  if (tokens.length === 0) {
    logger.info('No tokens found. Exiting.');
    return;
  }

  // Log the tokens we found
  for (const token of tokens) {
    logger.info(
      `  - ${token.name} (${new Date(token.timestamp).toLocaleDateString()})`
    );
  }

  const openaiClient = createOpenAIClient();
  const twitterClient = createTwitterClient();

  // Step 3: Generate intro tweet
  logger.info('\nGenerating intro tweet...');
  const introTweet = await generateIntroTweet(openaiClient);

  if (!introTweet) {
    logger.error('Failed to generate intro tweet');
    return;
  }

  logger.info(`Generated intro (${introTweet.length} chars):`);
  logger.info(`"${introTweet}"`);

  // Step 4: Generate tweets for each token
  const tokenTweets: string[] = [];

  for (const token of tokens) {
    logger.info(`\nGenerating tweet for "${token.name}"...`);
    const tweet = await generateTokenTweet(openaiClient, token);

    if (!tweet) {
      logger.error(`Failed to generate tweet for "${token.name}"`);
      continue;
    }

    logger.info(`Generated tweet (${tweet.length} chars):`);
    logger.info(`"${tweet}"`);
    tokenTweets.push(tweet);
  }

  if (tokenTweets.length === 0) {
    logger.error('Failed to generate any token tweets');
    return;
  }

  // Compile full thread: intro + token tweets
  const fullThread = [introTweet, ...tokenTweets];

  logger.info(`\n📝 Thread compiled: ${fullThread.length} tweets total`);

  if (dryRun) {
    logger.info('[DRY RUN] Would post thread:');
    fullThread.forEach((tweet, i) => {
      logger.info(`\n[${i + 1}/${fullThread.length}] ${tweet}`);
    });
    return;
  }

  // Step 5: Post the thread
  logger.info('\n🐦 Posting thread...');
  const success = await postThread(twitterClient, fullThread);

  if (success) {
    logger.info('\n✅ Thread posted successfully!');
  } else {
    logger.error('\n❌ Thread posting failed');
  }
}

/**
 * Main entry point (if run directly)
 */
if (import.meta.main) {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    logger.info('Running in DRY RUN mode - no tweets will be sent');
  }

  (async () => {
    try {
      await processShillThread(dryRun);
    } catch (error) {
      logger.error('Fatal error in shill thread process:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  })();
}
