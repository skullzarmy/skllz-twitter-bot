import type { TwitterApi } from 'twitter-api-v2';
import type OpenAI from 'openai';
import { pool } from './db';
import { logger } from './utils/logger';
import { createTwitterClient } from './index';
import { createOpenAIClient } from './openai';
import { syncObjktData } from './sync';
import { prompts } from './prompts';

interface SaleForThanks {
  sale_id: number;
  token_name: string;
  fa_contract: string;
  token_id: string;
  token_url: string;
  buyer_twitter?: string;
  buyer_alias?: string;
}

interface BatchedSale {
  token_name: string;
  fa_contract: string;
  token_id: string;
  token_url: string;
  buyers: string[];
  sale_ids: number[];
}

/**
 * Fetch all unprocessed sales from database
 */
async function getUnprocessedSales(): Promise<SaleForThanks[]> {
  const result = await pool.query<SaleForThanks>(
    `SELECT s.sale_id, s.token_name, s.fa_contract, s.token_id, s.buyer_twitter, s.buyer_alias, t.token_url
     FROM nft_sales s
     JOIN tokens t ON s.fa_contract = t.fa_contract AND s.token_id = t.token_id
     WHERE s.processed = false 
     ORDER BY s.sale_ts ASC`
  );

  return result.rows;
}

/**
 * Convert Twitter URL to @mention
 */
function cleanTwitterHandle(url: string | null | undefined): string | null {
  if (!url) return null;

  // Extract handle from URL like https://x.com/chinask1976
  const handle = url
    .split('/')
    .pop() // last path segment
    ?.replace(/\?.*/, '') // strip query string
    ?.replace(/^@/, '') // strip leading @
    ?.trim()
    .toLowerCase();

  return handle ? `@${handle}` : null;
}

/**
 * Batch sales by token and merge duplicate buyers
 */
function batchSalesByToken(sales: SaleForThanks[]): BatchedSale[] {
  const batches = new Map<string, BatchedSale>();

  for (const sale of sales) {
    // Use token_name as the key to group all sales of the same artwork
    // (handles both 1/1s with same token_id and generatives with different token_ids)
    const key = sale.token_name;

    let batch = batches.get(key);
    if (!batch) {
      batch = {
        token_name: sale.token_name,
        fa_contract: sale.fa_contract,
        token_id: sale.token_id,
        token_url: sale.token_url,
        buyers: [],
        sale_ids: [],
      };
      batches.set(key, batch);
    }

    batch.sale_ids.push(sale.sale_id);

    // Add buyer mention (convert twitter URL to @handle, or use alias)
    const twitterHandle = cleanTwitterHandle(sale.buyer_twitter);
    const buyerMention = twitterHandle || sale.buyer_alias;
    if (buyerMention && !batch.buyers.includes(buyerMention)) {
      batch.buyers.push(buyerMention);
    }
  }

  return Array.from(batches.values());
}

/**
 * Generate thank-you tweet using OpenAI
 */
async function generateThankYouTweet(
  client: OpenAI,
  batch: BatchedSale
): Promise<string | null> {
  const buyersText = batch.buyers.length > 0 ? batch.buyers.join(' ') : '';

  try {
    const completion = await client.chat.completions.create({
      model: 'o3-mini',
      messages: [
        { role: 'system', content: prompts.thankYou.system },
        {
          role: 'user',
          content: prompts.thankYou.user(
            batch.token_name,
            buyersText,
            batch.token_url
          ),
        },
      ],
      max_completion_tokens: 2000, // o3-mini needs tokens for reasoning + output
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error: unknown) {
    logger.error(`OpenAI error for "${batch.token_name}":`, error);
    return null;
  }
}

/**
 * Send tweet and return tweet ID
 */
async function sendTweet(
  client: TwitterApi,
  text: string
): Promise<string | null> {
  try {
    const tweet = await client.v2.tweet(text);
    return tweet.data.id;
  } catch (error) {
    logger.error(`Failed to send tweet:`, error);
    return null;
  }
}

/**
 * Mark sales as processed
 */
async function markSalesProcessed(saleIds: number[]): Promise<void> {
  if (saleIds.length === 0) return;

  await pool.query(
    `UPDATE nft_sales SET processed = true WHERE sale_id = ANY($1)`,
    [saleIds]
  );
}

/**
 * Process thank-you tweets for all unprocessed sales
 */
export async function processThankYouTweets(dryRun = false): Promise<void> {
  logger.info('Starting thank-you tweet process...');

  // Step 1: Sync latest data
  logger.info('Syncing latest sales data...');
  await syncObjktData(dryRun); // Respect dry-run flag for sync too
  logger.info('✅ Sync completed');

  // Step 2: Fetch unprocessed sales
  logger.info('Fetching unprocessed sales...');
  const sales = await getUnprocessedSales();
  logger.info(`Found ${sales.length} unprocessed sales`);

  if (sales.length === 0) {
    logger.info('No sales to thank. Exiting.');
    return;
  }

  // Step 3: Batch by token
  const batches = batchSalesByToken(sales);
  logger.info(`Batched into ${batches.length} thank-you tweets`);

  const openaiClient = createOpenAIClient();
  const twitterClient = createTwitterClient();

  let successCount = 0;
  let failCount = 0;

  // Step 4: Generate and send tweets
  for (const batch of batches) {
    logger.info(
      `\nProcessing batch for "${batch.token_name}" (${batch.sale_ids.length} sales, ${batch.buyers.length} buyers)...`
    );

    const tweetText = await generateThankYouTweet(openaiClient, batch);

    if (!tweetText) {
      logger.error(`Failed to generate tweet for "${batch.token_name}"`);
      failCount++;
      continue;
    }

    logger.info(`Generated tweet (${tweetText.length} chars):`);
    logger.info(`"${tweetText}"`);

    if (dryRun) {
      logger.info('[DRY RUN] Would send tweet and mark as processed');
      successCount++;
      continue;
    }

    // Send tweet
    const tweetId = await sendTweet(twitterClient, tweetText);

    if (!tweetId) {
      logger.error(`Failed to send tweet for "${batch.token_name}"`);
      failCount++;
      continue;
    }

    logger.info(`✅ Tweet sent: ${tweetId}`);

    // Mark sales as processed (only if not dry-run)
    await markSalesProcessed(batch.sale_ids);
    logger.info(
      `✅ Marked ${batch.sale_ids.length} sales as processed: ${batch.sale_ids.join(', ')}`
    );

    successCount++;
  }

  logger.info(
    `\n✅ Thank-you process complete: ${successCount} successful, ${failCount} failed`
  );
}

/**
 * CLI entry point (if run directly)
 */
if (import.meta.main) {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    logger.info('Running in DRY RUN mode - no tweets will be sent');
  }

  (async () => {
    try {
      await processThankYouTweets(dryRun);
      process.exit(0);
    } catch (error) {
      logger.error('Thank-you process failed:', error);
      process.exit(1);
    }
  })();
}
