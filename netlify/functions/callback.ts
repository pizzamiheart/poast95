import { Handler } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';
import { parse } from 'cookie';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { code, state } = event.queryStringParameters || {};
  const cookies = parse(event.headers.cookie || '');
  const { state: storedState, verifier: codeVerifier } = cookies;

  if (!code || !state || !storedState || !codeVerifier) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters' }),
    };
  }

  if (state !== storedState) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid state parameter' }),
    };
  }

  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    const { accessToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.TWITTER_CALLBACK_URL!,
    });

    // Get user info
    const loggedClient = new TwitterApi(accessToken);
    const { data: user } = await loggedClient.v2.me();

    return {
      statusCode: 200,
      body: JSON.stringify({
        accessToken,
        username: user.username,
      }),
    };
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to authenticate with Twitter' }),
    };
  }
};