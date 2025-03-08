import { Handler } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Get the access token from the Authorization header
  const authHeader = event.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Missing or invalid authorization header' }),
    };
  }

  const accessToken = authHeader.substring(7);
  
  try {
    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body || '{}');
    } catch (e) {
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

    // Initialize client with user's access token
    const client = new TwitterApi(accessToken);

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
            body: JSON.stringify({ error: 'Authentication failed' }),
          };
        case 88:
          return {
            statusCode: 429,
            body: JSON.stringify({ error: 'Rate limit exceeded' }),
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
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to post tweet' }),
    };
  }
};