import { GraphQLClient } from 'graphql-request';
import { config } from './config';
import { logger } from './utils/logger';

const OBJKT_ENDPOINT = config.objkt.graphqlEndpoint;

/**
 * Creates an objkt.com GraphQL client
 */
export function createObjktClient(): GraphQLClient {
  return new GraphQLClient(OBJKT_ENDPOINT);
}

/**
 * Query for minted tokens with active listings
 */
export async function getMyMintedTokens(
  client: GraphQLClient,
  wallets: string[]
) {
  const query = `
    query MyQuery($wallets: [String!]!) {
      token(
        where: {
          creators: { creator_address: { _in: $wallets } },
          listings_active: { seller_address: { _in: $wallets } }
        }
        order_by: { timestamp: desc }
      ) {
        description
        last_listed
        name
        supply
        timestamp
        fa_contract
        token_id
        listings_active(
          where: { seller_address: { _in: $wallets } }
        ) {
          amount
          amount_left
          price_xtz
        }
      }
    }
  `;

  const variables = { wallets };

  return client.request<{
    token: Array<{
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
    }>;
  }>(query, variables);
}

/**
 * Tests the objkt.com GraphQL API connection
 */
export async function testObjktConnection(): Promise<void> {
  logger.info('Testing objkt.com GraphQL API connection...');

  const client = createObjktClient();

  try {
    const query = `
      query {
        token(limit: 1) {
          name
          fa_contract
        }
      }
    `;

    const data = await client.request<{
      token: Array<{ name: string; fa_contract: string }>;
    }>(query);

    logger.info(`✅ Objkt API connection successful`);
    logger.info(`Endpoint: ${OBJKT_ENDPOINT}`);
    logger.info(`Test query returned ${data.token?.length || 0} token(s)`);
  } catch (error) {
    logger.error(
      `❌ Objkt API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

/**
 * Query for active open editions
 */
export async function getActiveOpenEditions(
  client: GraphQLClient,
  wallets: string[]
) {
  const query = `
    query ActiveOpenEditions($wallets: [String!]!, $currentTime: timestamptz!) {
      open_edition(
        where: { 
          seller_address: { _in: $wallets }
          end_time: { _gt: $currentTime }
        }
        order_by: { timestamp: desc }
      ) {
        end_time
        start_time
        timestamp
        fa_contract
        token_pk
        seller_address
        price
        max_per_wallet
        token {
          token_id
          fa_contract
          pk
          name
          timestamp
          display_uri
          description
          mime
          artifact_uri
          supply
          creators {
            creator_address
          }
        }
      }
    }
  `;

  const currentTime = new Date().toISOString();
  const variables = { wallets, currentTime };

  return client.request<{
    open_edition: Array<{
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
    }>;
  }>(query, variables);
}

/**
 * Query for generative collections
 */
export async function getGenerativeCollections(
  client: GraphQLClient,
  wallets: string[]
) {
  const query = `
    query GenerativeCollections($wallets: [String!]!) {
      fa(
        where: {
          creator_address: { _in: $wallets },
          collection_type: { _eq: "generative" }
        }
        order_by: { timestamp: desc }
      ) {
        contract
        name
        description
        timestamp
        collection_type
        tokens(limit: 1, order_by: { token_id: asc }) {
          token_id
          fa_contract
          pk
          name
          timestamp
          display_uri
          description
          mime
          artifact_uri
          supply
          metadata
          creators {
            creator_address
          }
          fa {
            editions
          }
        }
      }
    }
  `;

  const variables = { wallets };

  return client.request<{
    fa: Array<{
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
    }>;
  }>(query, variables);
}

/**
 * Query for recent listing sales (only original creations, not resells)
 */
export async function getListingSales(
  client: GraphQLClient,
  wallets: string[],
  limit = 20
) {
  const query = `
    query ListingSales($wallets: [String!]!, $limit: Int!) {
      listing_sale(
        where: {
          seller_address: { _in: $wallets }
          token: {
            creators: {
              creator_address: { _in: $wallets }
            }
          }
        }
        order_by: { timestamp: desc }
        limit: $limit
      ) {
        id
        buyer {
          address
          alias
          twitter
          tzdomain
        }
        token {
          fa_contract
          token_id
          name
          description
        }
        timestamp
      }
    }
  `;

  const variables = { wallets, limit };

  return client.request<{
    listing_sale: Array<{
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
    }>;
  }>(query, variables);
}

/**
 * Query for open edition sales (mints)
 */
export async function getOpenEditionSales(
  client: GraphQLClient,
  wallets: string[]
) {
  const query = `
    query OpenEditionSales($wallets: [String!]!, $currentTime: timestamptz!) {
      open_edition(
        where: { 
          seller_address: { _in: $wallets }
          end_time: { _gt: $currentTime }
        }
        order_by: { timestamp: desc }
      ) {
        fa_contract
        token_pk
        token {
          fa_contract
          token_id
          name
          description
        }
      }
    }
  `;

  const currentTime = new Date().toISOString();
  const variables = { wallets, currentTime };

  // First get the open editions
  const oeResult = await client.request<{
    open_edition: Array<{
      fa_contract: string;
      token_pk: string;
      token: {
        fa_contract: string;
        token_id: string;
        name: string;
        description: string | null;
      };
    }>;
  }>(query, variables);

  // Then fetch individual token instances for each OE
  const results: Array<{
    token: {
      fa_contract: string;
      name: string;
      description: string | null;
      tokens: Array<{
        token_id: string;
        timestamp: string;
        holders: Array<{
          holder_address: string;
          holder: {
            address: string;
            alias: string | null;
            twitter: string | null;
            tzdomain: string | null;
          };
        }>;
      }>;
    };
  }> = [];

  for (const oe of oeResult.open_edition) {
    const tokensQuery = `
      query OETokenInstances($faContract: String!, $tokenId: String!) {
        token(
          where: {
            fa_contract: { _eq: $faContract }
            token_id: { _eq: $tokenId }
          }
        ) {
          token_id
          timestamp
          holders {
            holder_address
            holder {
              address
              alias
              twitter
              tzdomain
            }
          }
        }
      }
    `;

    const tokensResult = await client.request<{
      token: Array<{
        token_id: string;
        timestamp: string;
        holders: Array<{
          holder_address: string;
          holder: {
            address: string;
            alias: string | null;
            twitter: string | null;
            tzdomain: string | null;
          };
        }>;
      }>;
    }>(tokensQuery, {
      faContract: oe.token.fa_contract,
      tokenId: oe.token.token_id,
    });

    results.push({
      token: {
        fa_contract: oe.token.fa_contract,
        name: oe.token.name,
        description: oe.token.description,
        tokens: tokensResult.token,
      },
    });
  }

  return { open_edition: results };
}

/**
 * Query for generative collection sales (mints)
 */
export async function getGenerativeSales(
  client: GraphQLClient,
  wallets: string[]
) {
  const query = `
    query GenerativeSales($wallets: [String!]!) {
      fa(
        where: {
          creator_address: { _in: $wallets }
          collection_type: { _eq: "generative" }
        }
        order_by: { timestamp: desc }
      ) {
        contract
        name
        description
        tokens(order_by: { timestamp: desc }, limit: 100) {
          token_id
          fa_contract
          timestamp
          holders {
            holder_address
            holder {
              address
              alias
              twitter
              tzdomain
            }
          }
        }
      }
    }
  `;

  const variables = { wallets };

  return client.request<{
    fa: Array<{
      contract: string;
      name: string;
      description: string | null;
      tokens: Array<{
        token_id: string;
        fa_contract: string;
        timestamp: string;
        holders: Array<{
          holder_address: string;
          holder: {
            address: string;
            alias: string | null;
            twitter: string | null;
            tzdomain: string | null;
          };
        }>;
      }>;
    }>;
  }>(query, variables);
}
