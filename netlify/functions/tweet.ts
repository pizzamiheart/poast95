import { Handler } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.VITE_TWITTER_API_KEY!,
  appSecret: process.env.VITE_TWITTER_API_SECRET!,
  accessToken: process.env.VITE_TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.VITE_TWITTER_ACCESS_SECRET!,
});

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');
    
    if (!text || typeof text !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Tweet text is required and must be a string' }),
      };
    }

    if (text.length > 280) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Tweet text must not exceed 280 characters' }),
      };
    }

    const tweet = await client.v2.tweet(text);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: tweet.data,
        tweet_url: `https://twitter.com/i/web/status/${tweet.data.id}`
      }),
    };
  } catch (error: any) {
    console.error('Error posting tweet:', error);
    
    // Handle Twitter API-specific errors
    if ('code' in error) {
      switch (error.code) {
        case 32:
          return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Authentication failed. Please check your Twitter credentials.' }),
          };
        case 88:
          return {
            statusCode: 429,
            body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          };
        case 186:
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Tweet text is too long' }),
          };
        case 187:
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Duplicate tweet' }),
          };
        case 220:
          return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Your credentials are no longer valid. Please check your Twitter settings.' }),
          };
        case 403:
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'You are not authorized to perform this action. Please check your Twitter app permissions.' }),
          };
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: error.message
      }),
    };
  }
};