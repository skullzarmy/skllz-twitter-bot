import { pool } from './db';
import { logger } from './utils/logger';

/**
 * Get table schema information
 */
export async function getTableSchema(tableName: string) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable,
        udt_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `,
      [tableName]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Fetch and display schema for nft_sales and tokens tables
 */
export async function inspectDatabaseSchema() {
  logger.info('Inspecting database schema...\n');

  const tables = ['nft_sales', 'tokens'];

  for (const tableName of tables) {
    try {
      const schema = await getTableSchema(tableName);

      if (schema.length === 0) {
        logger.warn(`⚠️  Table '${tableName}' not found`);
        continue;
      }

      logger.info(`\n📋 Table: ${tableName}`);
      logger.info('─'.repeat(80));

      for (const column of schema) {
        const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = column.character_maximum_length
          ? `(${column.character_maximum_length})`
          : '';
        const defaultVal = column.column_default
          ? ` DEFAULT ${column.column_default}`
          : '';

        logger.info(
          `  ${column.column_name.padEnd(30)} ${column.data_type}${maxLength.padEnd(10)} ${nullable}${defaultVal}`
        );
      }

      logger.info('─'.repeat(80));
    } catch (error) {
      logger.error(`Failed to get schema for ${tableName}:`, error);
    }
  }
}

/**
 * Generate TypeScript interfaces from table schemas
 */
export async function generateInterfaces() {
  const tables = ['nft_sales', 'tokens'];
  const interfaces: Record<string, string> = {};

  for (const tableName of tables) {
    const schema = await getTableSchema(tableName);

    if (schema.length === 0) continue;

    const interfaceName = tableName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    let interfaceStr = `export interface ${interfaceName} {\n`;

    for (const column of schema) {
      const tsType = mapPostgresToTypeScript(column.data_type, column.udt_name);
      const optional = column.is_nullable === 'YES' ? '?' : '';
      interfaceStr += `  ${column.column_name}${optional}: ${tsType};\n`;
    }

    interfaceStr += '}';
    interfaces[tableName] = interfaceStr;
  }

  return interfaces;
}

/**
 * Map PostgreSQL types to TypeScript types
 */
function mapPostgresToTypeScript(dataType: string, udtName: string): string {
  const typeMap: Record<string, string> = {
    integer: 'number',
    bigint: 'number',
    smallint: 'number',
    decimal: 'number',
    numeric: 'number',
    real: 'number',
    'double precision': 'number',
    serial: 'number',
    bigserial: 'number',
    'character varying': 'string',
    varchar: 'string',
    character: 'string',
    char: 'string',
    text: 'string',
    boolean: 'boolean',
    'timestamp without time zone': 'Date',
    'timestamp with time zone': 'Date',
    date: 'Date',
    time: 'string',
    json: 'any',
    jsonb: 'any',
    uuid: 'string',
  };

  return typeMap[dataType] || typeMap[udtName] || 'any';
}
