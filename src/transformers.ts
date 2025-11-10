/**
 * Transforms objkt.com API responses into a normalized format for database storage
 */

const TEIA_CONTRACT = 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton';
const REF_WALLET = 'tz1Qi77tcJn9foeHHP1QHj6UX1m1vLVLMbuY';

interface NormalizedToken {
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

interface TransformedData {
  'data.token': NormalizedToken;
  token_url: string;
}

/**
 * Transform minted tokens with active listings
 */
export function transformMintedToken(token: {
  description: string | null;
  last_listed: string | null;
  name: string;
  supply: number;
  timestamp: string;
  fa_contract: string;
  token_id: string;
  listings_active: Array<{
    amount: number;
    amount_left: number;
    price_xtz: number;
  }>;
}): TransformedData {
  const token_url =
    token.fa_contract === TEIA_CONTRACT
      ? `https://teia.art/objkt/${token.token_id}`
      : `https://objkt.com/tokens/${token.fa_contract}/${token.token_id}?ref=${REF_WALLET}`;

  return {
    'data.token': {
      description: token.description ?? '',
      last_listed: token.last_listed,
      name: token.name,
      supply: token.supply,
      timestamp: token.timestamp,
      fa_contract: token.fa_contract,
      token_id: token.token_id,
      listings_active: token.listings_active.map((listing) => ({
        amount: listing.amount,
        amount_left: listing.amount_left,
        price_xtz: listing.price_xtz,
      })),
    },
    token_url,
  };
}

/**
 * Transform open edition to normalized token format
 */
export function transformOpenEdition(edition: {
  end_time: string;
  start_time: string;
  timestamp: string;
  fa_contract: string;
  token_pk: string;
  seller_address: string;
  price: number;
  max_per_wallet: number;
  token: {
    token_id: string;
    fa_contract: string;
    pk: string;
    name: string;
    timestamp: string;
    display_uri: string | null;
    description: string | null;
    mime: string | null;
    artifact_uri: string | null;
    supply: number;
    creators: Array<{
      creator_address: string;
    }>;
  };
}): TransformedData {
  const token = edition.token;

  const token_url =
    token.fa_contract === TEIA_CONTRACT
      ? `https://teia.art/objkt/${token.token_id}`
      : `https://objkt.com/tokens/${token.fa_contract}/${token.token_id}?ref=${edition.seller_address}`;

  return {
    'data.token': {
      description: token.description ?? '',
      last_listed: edition.timestamp,
      name: token.name,
      supply: token.supply,
      timestamp: token.timestamp,
      fa_contract: token.fa_contract,
      token_id: token.token_id,
      listings_active: [
        {
          amount: token.supply,
          amount_left: null,
          price_xtz: edition.price,
        },
      ],
    },
    token_url,
  };
}

/**
 * Transform generative collection to normalized token format
 */
export function transformGenerativeCollection(fa: {
  contract: string;
  name: string;
  description: string | null;
  timestamp: string;
  collection_type: string;
  tokens: Array<{
    token_id: string;
    fa_contract: string;
    pk: string;
    name: string;
    timestamp: string;
    display_uri: string | null;
    description: string | null;
    mime: string | null;
    artifact_uri: string | null;
    supply: number;
    metadata: Record<string, unknown> | null;
    creators: Array<{
      creator_address: string;
    }>;
    fa: {
      editions: number;
    };
  }>;
}): TransformedData {
  const token = fa.tokens[0];

  if (!token) {
    throw new Error('Generative collection has no tokens');
  }

  const token_url = `https://www.editart.xyz/series/${fa.contract}`;

  return {
    'data.token': {
      description: token.description ?? fa.description ?? '',
      last_listed: fa.timestamp,
      name: fa.name,
      supply: token.fa.editions ?? token.supply,
      timestamp: token.timestamp,
      fa_contract: token.fa_contract,
      token_id: token.token_id,
      listings_active: [
        {
          amount: token.fa.editions ?? token.supply,
          amount_left: null,
          price_xtz: null,
        },
      ],
    },
    token_url,
  };
}

/**
 * Transform any objkt query result to normalized format
 */
export function transformObjktData(
  data:
    | { type: 'minted'; token: Parameters<typeof transformMintedToken>[0] }
    | {
        type: 'open_edition';
        edition: Parameters<typeof transformOpenEdition>[0];
      }
    | {
        type: 'generative';
        fa: Parameters<typeof transformGenerativeCollection>[0];
      }
): TransformedData {
  switch (data.type) {
    case 'minted':
      return transformMintedToken(data.token);
    case 'open_edition':
      return transformOpenEdition(data.edition);
    case 'generative':
      return transformGenerativeCollection(data.fa);
  }
}

/**
 * Transform listing sale to database format
 */
export function transformListingSale(sale: {
  id: string;
  buyer: {
    address: string;
    alias: string | null;
    twitter: string | null;
    tzdomain: string | null;
  };
  token: {
    fa_contract: string;
    token_id: string;
    name: string;
    description: string | null;
  };
  timestamp: string;
}): {
  sale_id: string;
  token_name: string;
  fa_contract: string;
  token_id: string;
  buyer_alias: string | null;
  buyer_twitter: string | null;
  sale_ts: Date;
  token_url: string;
} {
  const token_url =
    sale.token.fa_contract === TEIA_CONTRACT
      ? `https://teia.art/objkt/${sale.token.token_id}`
      : `https://objkt.com/tokens/${sale.token.fa_contract}/${sale.token.token_id}?ref=${REF_WALLET}`;

  return {
    sale_id: sale.id,
    token_name: sale.token.name,
    fa_contract: sale.token.fa_contract,
    token_id: sale.token.token_id,
    buyer_alias: sale.buyer.alias || sale.buyer.tzdomain || sale.buyer.address,
    buyer_twitter: sale.buyer.twitter,
    sale_ts: new Date(sale.timestamp),
    token_url,
  };
}

/**
 * Transform open edition or generative mint to sale format
 */
export function transformMintSale(mint: {
  token_id: string;
  fa_contract: string;
  token_name: string;
  timestamp: string;
  holder: {
    address: string;
    alias: string | null;
    twitter: string | null;
    tzdomain: string | null;
  };
}): {
  token_name: string;
  fa_contract: string;
  token_id: string;
  buyer_alias: string | null;
  buyer_twitter: string | null;
  sale_ts: Date;
  token_url: string;
} {
  const token_url =
    mint.fa_contract === TEIA_CONTRACT
      ? `https://teia.art/objkt/${mint.token_id}`
      : `https://objkt.com/tokens/${mint.fa_contract}/${mint.token_id}?ref=${REF_WALLET}`;

  return {
    token_name: mint.token_name,
    fa_contract: mint.fa_contract,
    token_id: mint.token_id,
    buyer_alias:
      mint.holder.alias || mint.holder.tzdomain || mint.holder.address,
    buyer_twitter: mint.holder.twitter,
    sale_ts: new Date(mint.timestamp),
    token_url,
  };
}
