import { TwitterApi } from 'twitter-api-v2';

// Create a single instance of the Twitter client
const client = new TwitterApi({
  appKey: import.meta.env.VITE_TWITTER_API_KEY || '',
  appSecret: import.meta.env.VITE_TWITTER_API_SECRET || '',
  accessToken: import.meta.env.VITE_TWITTER_ACCESS_TOKEN || '',
  accessSecret: import.meta.env.VITE_TWITTER_ACCESS_SECRET || '',
});

// Create the read-write client with proper error handling
export const postTweet = async (text: string) => {
  // Validate environment variables
  const requiredEnvVars = [
    'VITE_TWITTER_API_KEY',
    'VITE_TWITTER_API_SECRET',
    'VITE_TWITTER_ACCESS_TOKEN',
    'VITE_TWITTER_ACCESS_SECRET'
  ];

  const missingEnvVars = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required Twitter credentials: ${missingEnvVars.join(', ')}`);
  }

  try {
    // Create a new client instance for each request to ensure fresh credentials
    const rwClient = client.readWrite;
    
    // Use v2 endpoint with proper error handling
    const tweet = await rwClient.v2.tweet({
      text: text,
      // Add optional parameters as needed
      // reply: { in_reply_to_tweet_id: '...' },
      // media: { media_ids: ['...'] }
    });

    if (!tweet.data?.id) {
      throw new Error('Failed to get tweet ID from response');
    }

    return tweet;
  } catch (error) {
    // Properly handle API-specific errors
    if (error instanceof Error) {
      // Check for rate limiting
      if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      // Check for authentication errors
      if (error.message.includes('401')) {
        throw new Error('Authentication failed. Please check your Twitter credentials.');
      }
      // Check for forbidden errors
      if (error.message.includes('403')) {
        throw new Error('You are not authorized to perform this action.');
      }
    }
    
    console.error('Error posting tweet:', error);
    throw error;
  }
};