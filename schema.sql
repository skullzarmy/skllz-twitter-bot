-- Initial database schema setup
-- This creates all required tables for the SKLLZ Twitter Bot

-- ============================================================================
-- TOKENS TABLE
-- Stores NFT token information synced from objkt.com and TzKT
-- ============================================================================
CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(255) NOT NULL,
  fa_contract VARCHAR(255) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  supply INTEGER DEFAULT 1,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  last_listed TIMESTAMP WITH TIME ZONE,
  listing_amount INTEGER,
  listing_amount_left INTEGER,
  listing_price_xtz BIGINT,
  token_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tokens_unique_contract_token UNIQUE (token_id, fa_contract)
);

-- Index for faster lookups by timestamp (used for latest tokens)
CREATE INDEX IF NOT EXISTS idx_tokens_timestamp ON tokens(timestamp DESC);

-- Index for contract lookups
CREATE INDEX IF NOT EXISTS idx_tokens_contract ON tokens(fa_contract);

-- ============================================================================
-- NFT_SALES TABLE
-- Tracks all NFT sales (both listing sales and mint sales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS nft_sales (
  sale_id BIGINT PRIMARY KEY,
  token_name TEXT NOT NULL,
  fa_contract VARCHAR(255) NOT NULL,
  token_id VARCHAR(255) NOT NULL,
  buyer_alias VARCHAR(255),
  buyer_twitter TEXT,
  processed BOOLEAN DEFAULT false,
  sale_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying unprocessed sales
CREATE INDEX IF NOT EXISTS idx_nft_sales_processed ON nft_sales(processed) WHERE processed = false;

-- Index for sales by timestamp
CREATE INDEX IF NOT EXISTS idx_nft_sales_timestamp ON nft_sales(sale_ts DESC);

-- Index for sales by token
CREATE INDEX IF NOT EXISTS idx_nft_sales_token ON nft_sales(fa_contract, token_id);

-- ============================================================================
-- SCHEDULES TABLE
-- Stores dynamic cron schedules for thank-you tweets and shill threads
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('thank', 'shill')),
  cron_pattern VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying enabled schedules by type
CREATE INDEX IF NOT EXISTS idx_schedules_type_enabled ON schedules(type, enabled) WHERE enabled = true;

-- Index for ordering by next run time
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run_at) WHERE enabled = true;
