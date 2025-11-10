import { pool } from './db';
import { createObjktClient } from './objkt';
import {
  getMyMintedTokens,
  getActiveOpenEditions,
  getGenerativeCollections,
  getListingSales,
  getOpenEditionSales,
  getGenerativeSales,
} from './objkt';
import {
  transformMintedToken,
  transformOpenEdition,
  transformGenerativeCollection,
  transformListingSale,
  transformMintSale,
} from './transformers';
import { config } from './config';
import { logger } from './utils/logger';

interface TransformedToken {
  description: string;
  last_listed: string | null;
  name: string;
  supply: number;
  timestamp: string;
  fa_contract: string;
  token_id: string;
  listings_active: Array<{
    amount: number;
    amount_left: number | null;
    price_xtz: number | null;
  }>;
}

interface TokenInsertData {
  token_id: string;
  fa_contract: string;
  name: string;
  description: string;
  supply: number;
  timestamp: Date;
  last_listed: Date | null;
  listing_amount: number | null;
  listing_amount_left: number | null;
  listing_price_xtz: number | null;
  token_url: string;
}

/**
 * Select the best listing from the listings_active array
 * Prefers listings without nulls in amount_left and price_xtz
 */
function selectBestListing(listings: TransformedToken['listings_active']): {
  listing_amount: number | null;
  listing_amount_left: number | null;
  listing_price_xtz: number | null;
} {
  if (!listings || listings.length === 0) {
    return {
      listing_amount: null,
      listing_amount_left: null,
      listing_price_xtz: null,
    };
  }

  // Find first listing without nulls
  const bestListing = listings.find(
    (l) => l.amount_left !== null && l.price_xtz !== null
  );

  // Fall back to first listing if no perfect match
  const listing = bestListing || listings[0];

  if (!listing) {
    return {
      listing_amount: null,
      listing_amount_left: null,
      listing_price_xtz: null,
    };
  }

  return {
    listing_amount: listing.amount,
    listing_amount_left: listing.amount_left,
    listing_price_xtz: listing.price_xtz,
  };
}

/**
 * Prepare token data for database insertion
 */
function prepareTokenForInsert(
  tokenData: TransformedToken,
  tokenUrl: string
): TokenInsertData {
  const bestListing = selectBestListing(tokenData.listings_active);

  return {
    token_id: tokenData.token_id,
    fa_contract: tokenData.fa_contract,
    name: tokenData.name,
    description: tokenData.description,
    supply: tokenData.supply,
    timestamp: new Date(tokenData.timestamp),
    last_listed: tokenData.last_listed ? new Date(tokenData.last_listed) : null,
    listing_amount: bestListing.listing_amount,
    listing_amount_left: bestListing.listing_amount_left,
    listing_price_xtz: bestListing.listing_price_xtz,
    token_url: tokenUrl,
  };
}

/**
 * Upsert token into database
 */
async function upsertToken(
  token: TokenInsertData,
  dryRun = false
): Promise<void> {
  if (dryRun) {
    logger.info(
      `[DRY RUN] Would upsert token: ${token.name} (${token.fa_contract}/${token.token_id})`
    );
    return;
  }
  const query = `
    INSERT INTO tokens (
      token_id,
      fa_contract,
      name,
      description,
      supply,
      timestamp,
      last_listed,
      listing_amount,
      listing_amount_left,
      listing_price_xtz,
      token_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (token_id, fa_contract)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      supply = EXCLUDED.supply,
      timestamp = EXCLUDED.timestamp,
      last_listed = EXCLUDED.last_listed,
      listing_amount = EXCLUDED.listing_amount,
      listing_amount_left = EXCLUDED.listing_amount_left,
      listing_price_xtz = EXCLUDED.listing_price_xtz,
      token_url = EXCLUDED.token_url
  `;

  const values = [
    token.token_id,
    token.fa_contract,
    token.name,
    token.description,
    token.supply,
    token.timestamp,
    token.last_listed,
    token.listing_amount,
    token.listing_amount_left,
    token.listing_price_xtz,
    token.token_url,
  ];

  await pool.query(query, values);
}

/**
 * Insert sale into database
 */
async function insertSale(
  sale: {
    sale_id: string;
    token_name: string;
    fa_contract: string;
    token_id: string;
    buyer_alias: string | null;
    buyer_twitter: string | null;
    sale_ts: Date;
    token_url: string;
  },
  dryRun = false
): Promise<void> {
  if (dryRun) {
    logger.info(
      `[DRY RUN] Would insert sale: ${sale.token_name} bought by ${sale.buyer_alias}`
    );
    return;
  }

  const query = `
    INSERT INTO nft_sales (
      sale_id,
      token_name,
      fa_contract,
      token_id,
      buyer_alias,
      buyer_twitter,
      sale_ts,
      processed
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, false)
    ON CONFLICT (sale_id)
    DO NOTHING
  `;

  const values = [
    sale.sale_id,
    sale.token_name,
    sale.fa_contract,
    sale.token_id,
    sale.buyer_alias,
    sale.buyer_twitter,
    sale.sale_ts,
  ];

  await pool.query(query, values);
}

/**
 * Insert mint sale into database (for OE/generative mints without sale_id)
 */
async function insertMintSale(
  sale: {
    token_name: string;
    fa_contract: string;
    token_id: string;
    buyer_alias: string | null;
    buyer_twitter: string | null;
    sale_ts: Date;
    token_url: string;
  },
  dryRun = false
): Promise<void> {
  if (dryRun) {
    logger.info(
      `[DRY RUN] Would insert mint sale: ${sale.token_name} minted by ${sale.buyer_alias}`
    );
    return;
  }

  // Generate a unique numeric sale_id from contract and token_id hash
  const saleIdString = `${sale.fa_contract}:${sale.token_id}`;
  let saleId = 0;
  for (let i = 0; i < saleIdString.length; i++) {
    saleId = (saleId * 31 + saleIdString.charCodeAt(i)) >>> 0;
  }

  const query = `
    INSERT INTO nft_sales (
      sale_id,
      token_name,
      fa_contract,
      token_id,
      buyer_alias,
      buyer_twitter,
      sale_ts,
      processed
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, false)
    ON CONFLICT (sale_id)
    DO NOTHING
  `;

  const values = [
    saleId,
    sale.token_name,
    sale.fa_contract,
    sale.token_id,
    sale.buyer_alias,
    sale.buyer_twitter,
    sale.sale_ts,
  ];

  await pool.query(query, values);
}

/**
 * Sync all objkt data to database
 */
export async function syncObjktData(dryRun = false): Promise<{
  minted: number;
  openEditions: number;
  generative: number;
  sales: number;
  oeSales: number;
  generativeSales: number;
  total: number;
}> {
  if (dryRun) {
    logger.info(
      '🔍 Starting objkt data sync (DRY RUN - no changes will be made)...'
    );
  } else {
    logger.info('Starting objkt data sync...');
  }

  const client = createObjktClient();
  const wallets = config.wallets.addresses;

  let mintedCount = 0;
  let openEditionsCount = 0;
  let generativeCount = 0;
  let salesCount = 0;
  let oeSalesCount = 0;
  let generativeSalesCount = 0;

  try {
    // Sync minted tokens with active listings
    logger.info('Syncing minted tokens...');
    const mintedData = await getMyMintedTokens(client, wallets);
    for (const token of mintedData.token) {
      const transformed = transformMintedToken(token);
      const insertData = prepareTokenForInsert(
        transformed['data.token'],
        transformed.token_url
      );
      await upsertToken(insertData, dryRun);
      mintedCount++;
    }
    logger.info(`✅ Synced ${mintedCount} minted tokens`);

    // Sync active open editions
    logger.info('Syncing open editions...');
    const openEditionsData = await getActiveOpenEditions(client, wallets);
    for (const edition of openEditionsData.open_edition) {
      const transformed = transformOpenEdition(edition);
      const insertData = prepareTokenForInsert(
        transformed['data.token'],
        transformed.token_url
      );
      await upsertToken(insertData, dryRun);
      openEditionsCount++;
    }
    logger.info(`✅ Synced ${openEditionsCount} open editions`);

    // Sync generative collections
    logger.info('Syncing generative collections...');
    const generativeData = await getGenerativeCollections(client, wallets);
    for (const fa of generativeData.fa) {
      const transformed = transformGenerativeCollection(fa);
      const insertData = prepareTokenForInsert(
        transformed['data.token'],
        transformed.token_url
      );
      await upsertToken(insertData, dryRun);
      generativeCount++;
    }
    logger.info(`✅ Synced ${generativeCount} generative collections`);

    // Sync listing sales
    logger.info('Syncing listing sales...');
    const salesData = await getListingSales(client, wallets, 20);
    for (const sale of salesData.listing_sale) {
      const transformed = transformListingSale(sale);
      await insertSale(transformed, dryRun);
      salesCount++;
    }
    logger.info(`✅ Synced ${salesCount} sales`);

    // Sync open edition sales (mints)
    logger.info('Syncing open edition sales...');
    const oeSalesData = await getOpenEditionSales(client, wallets);
    for (const oe of oeSalesData.open_edition) {
      for (const token of oe.token.tokens) {
        // Each token represents a mint/sale
        for (const holderInfo of token.holders) {
          // Skip if the holder is in the watched wallets (self-mint)
          if (wallets.includes(holderInfo.holder.address)) {
            continue;
          }
          const mintSale = transformMintSale({
            token_id: token.token_id,
            fa_contract: oe.token.fa_contract,
            token_name: oe.token.name,
            timestamp: token.timestamp,
            holder: holderInfo.holder,
          });
          await insertMintSale(mintSale, dryRun);
          oeSalesCount++;
        }
      }
    }
    logger.info(`✅ Synced ${oeSalesCount} open edition sales`);

    // Sync generative collection sales (mints)
    logger.info('Syncing generative collection sales...');
    const genSalesData = await getGenerativeSales(client, wallets);
    for (const fa of genSalesData.fa) {
      for (const token of fa.tokens) {
        // Each token represents a mint/sale
        for (const holderInfo of token.holders) {
          // Skip if the holder is in the watched wallets (self-mint)
          if (wallets.includes(holderInfo.holder.address)) {
            continue;
          }
          const mintSale = transformMintSale({
            token_id: token.token_id,
            fa_contract: token.fa_contract,
            token_name: fa.name,
            timestamp: token.timestamp,
            holder: holderInfo.holder,
          });
          await insertMintSale(mintSale, dryRun);
          generativeSalesCount++;
        }
      }
    }
    logger.info(`✅ Synced ${generativeSalesCount} generative sales`);

    const total =
      mintedCount +
      openEditionsCount +
      generativeCount +
      salesCount +
      oeSalesCount +
      generativeSalesCount;
    if (dryRun) {
      logger.info(`\n🔍 Dry run complete! Would have synced ${total} items`);
    } else {
      logger.info(`\n🎉 Sync complete! Total items synced: ${total}`);
    }

    return {
      minted: mintedCount,
      openEditions: openEditionsCount,
      generative: generativeCount,
      sales: salesCount,
      oeSales: oeSalesCount,
      generativeSales: generativeSalesCount,
      total,
    };
  } catch (error) {
    logger.error('❌ Sync failed:', error);
    throw error;
  }
}

/**
 * Run sync manually
 */
export async function runSync(dryRun = false): Promise<void> {
  try {
    await syncObjktData(dryRun);
    process.exit(0);
  } catch (error) {
    logger.error('Sync error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv.includes('--sync')) {
  const dryRun = process.argv.includes('--dry-run');
  runSync(dryRun);
}
