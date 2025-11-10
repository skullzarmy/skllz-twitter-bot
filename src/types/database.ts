/**
 * Database type definitions for NFT sales and tokens
 * Auto-generated from database schema
 */

export interface NftSales {
  sale_id: number;
  token_name: string;
  fa_contract: string;
  token_id: string;
  buyer_alias?: string;
  buyer_twitter?: string;
  processed?: boolean;
  sale_ts?: Date;
}

export interface Tokens {
  id: number;
  token_id: string;
  fa_contract: string;
  name?: string;
  description?: string;
  supply?: number;
  timestamp?: Date;
  last_listed?: Date;
  listing_amount?: number;
  listing_amount_left?: number;
  listing_price_xtz?: number;
  token_url?: string;
}
