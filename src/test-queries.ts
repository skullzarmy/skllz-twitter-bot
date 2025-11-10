import {
  createObjktClient,
  getMyMintedTokens,
  getActiveOpenEditions,
  getGenerativeCollections,
} from './objkt';
import {
  transformMintedToken,
  transformOpenEdition,
  transformGenerativeCollection,
} from './transformers';
import { config } from './config';
import { logger } from './utils/logger';

async function main() {
  logger.info('Testing Objkt queries...\n');

  const client = createObjktClient();
  const wallets = config.wallets.addresses;

  logger.info(`Watching wallets: ${wallets.join(', ')}\n`);

  try {
    // Test minted tokens query
    logger.info('=== MINTED TOKENS WITH ACTIVE LISTINGS ===\n');
    const mintedData = await getMyMintedTokens(client, wallets);
    logger.info('Raw response:');
    console.log(JSON.stringify(mintedData, null, 2));

    logger.info('\nTransformed data:');
    const transformedMinted = mintedData.token.map((token) =>
      transformMintedToken(token)
    );
    console.log(JSON.stringify(transformedMinted, null, 2));

    // Test open editions query
    logger.info('\n=== ACTIVE OPEN EDITIONS ===\n');
    const openEditionsData = await getActiveOpenEditions(client, wallets);
    logger.info('Raw response:');
    console.log(JSON.stringify(openEditionsData, null, 2));

    logger.info('\nTransformed data:');
    const transformedOE = openEditionsData.open_edition.map((edition) =>
      transformOpenEdition(edition)
    );
    console.log(JSON.stringify(transformedOE, null, 2));

    // Test generative collections query
    logger.info('\n=== GENERATIVE COLLECTIONS ===\n');
    const generativeData = await getGenerativeCollections(client, wallets);
    logger.info('Raw response:');
    console.log(JSON.stringify(generativeData, null, 2));

    logger.info('\nTransformed data:');
    const transformedGen = generativeData.fa.map((fa) =>
      transformGenerativeCollection(fa)
    );
    console.log(JSON.stringify(transformedGen, null, 2));

    process.exit(0);
  } catch (error) {
    logger.error('❌ Query failed:', error);
    process.exit(1);
  }
}

main();
