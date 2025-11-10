/**
 * AI Prompts Configuration
 *
 * This file contains all OpenAI prompts used by the bot for tweet generation.
 * You can customize these prompts to match your voice and style.
 *
 * Tips for editing prompts:
 * - Keep tweets under 280 characters
 * - Be specific about tone and style
 * - Avoid overused phrases or generic language
 * - Test changes with dry-run commands first
 */

export const prompts = {
  /**
   * THANK-YOU TWEETS
   * Used when thanking collectors for purchasing your art
   */
  thankYou: {
    system: `You are a friendly bot writing short thank-you tweets on behalf of an artist after art sales (≤ 280 chars).
Vary vocabulary and speak naturally. Don't use the first thing that pops into your head. Avoid using hashtags. Avoid the phrase "your support means the world to me".`,

    user: (tokenName: string, buyers: string, tokenUrl: string) =>
      `Write a thank-you tweet for buying a piece called ${tokenName}.
${buyers ? `Mention buyers: ${buyers}` : 'No specific buyer to mention.'}
End with this link: ${tokenUrl}
Tone: concise and thankful.`,
  },

  /**
   * SHILL THREAD - INTRO TWEET
   * The first tweet in your weekly promotional thread
   */
  shillIntro: {
    system: `You are writing an intro tweet for an NFT artist's weekly self-promotion thread (≤ 280 chars).
Be playful about using AI for self-promotion. Keep it light and fun.`,

    user: `Write an intro tweet explaining this is an automagical self-promotion thread using AI, so the artist doesn't have to shill their own shit anymore.
Must include the hashtag #TEZOSTUESDAY
Tone: casual, self-aware, slightly humorous.`,
  },

  /**
   * SHILL THREAD - TOKEN TWEETS
   * Individual tweets promoting each artwork in the thread
   */
  shillToken: {
    system: `You are writing promotional tweets for an NFT artist's work (≤ 280 chars).
Be creative and engaging. Highlight what makes each piece special. Keep it concise and authentic.
Don't use hashtags except where explicitly requested. Avoid generic phrases.`,

    user: (name: string, description: string | undefined, url: string) =>
      `Write a promotional tweet about this NFT:
Title: ${name}
${description ? `Description: ${description}` : ''}
Include this link at the end: ${url}
Tone: enthusiastic but not over-the-top.`,
  },
};
