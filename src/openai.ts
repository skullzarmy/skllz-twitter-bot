import OpenAI from 'openai';
import { config } from './config';
import { logger } from './utils/logger';

/**
 * Creates an OpenAI client with configured API key
 */
export function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: config.openai.apiKey,
  });
}

/**
 * Tests the OpenAI connection by making a simple completion request
 */
export async function testOpenAIConnection(): Promise<void> {
  logger.info('Testing OpenAI connection...');

  const client = createOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content || '';
    logger.info(`✅ OpenAI connection successful`);
    logger.info(`Model: ${config.openai.model}`);
    logger.info(`Test response: ${response}`);
    logger.info(`Tokens used: ${completion.usage?.total_tokens || 0}`);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      logger.error(`❌ OpenAI API Error: ${error.status} - ${error.message}`);
    } else {
      logger.error(
        `❌ OpenAI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    throw error;
  }
}

/**
 * Generate a chat completion with error handling
 */
export async function generateChatCompletion(
  client: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }
): Promise<string | null> {
  try {
    const completion = await client.chat.completions.create({
      model: config.openai.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 500,
      top_p: options?.topP ?? 1,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      logger.error(`OpenAI API Error: ${error.status} - ${error.message}`);
    } else {
      logger.error(
        `Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    return null;
  }
}
