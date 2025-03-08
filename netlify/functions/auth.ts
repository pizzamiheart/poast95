import { Handler } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });

  // Generate OAuth 2.0 URL
  const { url, state, codeVerifier } = client.generateOAuth2AuthLink(
    process.env.TWITTER_CALLBACK_URL!,
    { scope: ['tweet.read', 'tweet.write', 'users.read'] }
  );

  // Store state and code verifier in cookie for validation
  const cookieValue = `state=${state}; verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`;

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': cookieValue,
    },
    body: JSON.stringify({ url }),
  };
};