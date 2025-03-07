import { Handler } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TWITTER_API_KEY: string;
      TWITTER_API_SECRET: string;
      TWITTER_ACCESS_TOKEN: string;
      TWITTER_ACCESS_SECRET: string;
    }
  }
}

export const handler: Handler = async (event) => {
  // Log the incoming request
  console.log('Received request to tweet function');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Validate environment variables
    const requiredEnvVars = [
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    // Log environment variable status (without exposing values)
    console.log('Environment variables status:', {
      present: requiredEnvVars.filter(varName => !!process.env[varName]),
      missing: missingEnvVars
    });

    if (missingEnvVars.length > 0) {
      console.error('Missing environment variables:', missingEnvVars);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server configuration error: Missing Twitter credentials',
          details: `Missing: ${missingEnvVars.join(', ')}`
        }),
      };
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body || '{}');
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { text } = parsedBody;
    
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

    console.log('Attempting to post tweet');
    const tweet = await client.v2.tweet(text);
    
    if (!tweet.data?.id) {
      throw new Error('Failed to get tweet ID from response');
    }

    console.log('Successfully posted tweet:', tweet.data.id);
    
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
    
    if ('code' in error) {
      switch (error.code) {
        case 32:
          return {
            statusCode: 401,
            body: JSON.stringify({ 
              error: 'Authentication failed. Please check your Twitter credentials.',
              code: error.code
            }),
          };
        case 88:
          return {
            statusCode: 429,
            body: JSON.stringify({ 
              error: 'Rate limit exceeded. Please try again later.',
              code: error.code
            }),
          };
        case 186:
          return {
            statusCode: 400,
            body: JSON.stringify({ 
              error: 'Tweet text is too long',
              code: error.code
            }),
          };
        case 187:
          return {
            statusCode: 400,
            body: JSON.stringify({ 
              error: 'Duplicate tweet',
              code: error.code
            }),
          };
        case 220:
          return {
            statusCode: 401,
            body: JSON.stringify({ 
              error: 'Your credentials are no longer valid. Please check your Twitter settings.',
              code: error.code
            }),
          };
        case 403:
          return {
            statusCode: 403,
            body: JSON.stringify({ 
              error: 'You are not authorized to perform this action. Please check your Twitter app permissions.',
              code: error.code
            }),
          };
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      }),
    };
  }
};