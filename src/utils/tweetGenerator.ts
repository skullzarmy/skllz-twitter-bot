/**
 * Utility functions for generating tweet content
 */

/**
 * Generate a thread from a long message
 * Splits the message into tweets of max 280 characters
 */
export function generateThread(message: string, maxLength = 280): string[] {
  const words = message.split(' ');
  const threads: string[] = [];
  let currentTweet = '';

  for (const word of words) {
    const testTweet = currentTweet ? `${currentTweet} ${word}` : word;

    if (testTweet.length <= maxLength) {
      currentTweet = testTweet;
    } else {
      if (currentTweet) {
        threads.push(currentTweet);
      }
      currentTweet = word;
    }
  }

  if (currentTweet) {
    threads.push(currentTweet);
  }

  // Add thread numbering
  return threads.map((tweet, index) => {
    if (threads.length > 1) {
      return `${index + 1}/${threads.length} ${tweet}`;
    }
    return tweet;
  });
}
