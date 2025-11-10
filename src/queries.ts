import { pool } from './db';
import type { NftSales, Tokens } from './types/database';

/**
 * Query helper for nft_sales table
 */
export async function getUnprocessedSales(): Promise<NftSales[]> {
  const result = await pool.query<NftSales>(
    'SELECT * FROM nft_sales WHERE processed = false OR processed IS NULL ORDER BY sale_ts DESC'
  );
  return result.rows;
}

export async function markSaleAsProcessed(saleId: number): Promise<void> {
  await pool.query('UPDATE nft_sales SET processed = true WHERE sale_id = $1', [
    saleId,
  ]);
}

export async function getSaleById(saleId: number): Promise<NftSales | null> {
  const result = await pool.query<NftSales>(
    'SELECT * FROM nft_sales WHERE sale_id = $1',
    [saleId]
  );
  return result.rows[0] || null;
}

/**
 * Query helper for tokens table
 */
export async function getTokenByContractAndId(
  faContract: string,
  tokenId: string
): Promise<Tokens | null> {
  const result = await pool.query<Tokens>(
    'SELECT * FROM tokens WHERE fa_contract = $1 AND token_id = $2',
    [faContract, tokenId]
  );
  return result.rows[0] || null;
}

export async function getListedTokens(): Promise<Tokens[]> {
  const result = await pool.query<Tokens>(
    'SELECT * FROM tokens WHERE listing_amount_left > 0 ORDER BY last_listed DESC'
  );
  return result.rows;
}

export async function updateTokenListing(
  id: number,
  updates: {
    listing_amount?: number;
    listing_amount_left?: number;
    listing_price_xtz?: number;
    last_listed?: Date;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: (number | Date)[] = [];
  let paramIndex = 1;

  if (updates.listing_amount !== undefined) {
    fields.push(`listing_amount = $${paramIndex++}`);
    values.push(updates.listing_amount);
  }
  if (updates.listing_amount_left !== undefined) {
    fields.push(`listing_amount_left = $${paramIndex++}`);
    values.push(updates.listing_amount_left);
  }
  if (updates.listing_price_xtz !== undefined) {
    fields.push(`listing_price_xtz = $${paramIndex++}`);
    values.push(updates.listing_price_xtz);
  }
  if (updates.last_listed !== undefined) {
    fields.push(`last_listed = $${paramIndex++}`);
    values.push(updates.last_listed);
  }

  if (fields.length === 0) return;

  values.push(id);
  await pool.query(
    `UPDATE tokens SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}
