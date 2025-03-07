import express from 'express';
import cors from 'cors';
import { TwitterApi } from 'twitter-api-v2';
import { createServer } from 'vite';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the Twitter client with proper error handling
let client;
try {
  // Validate Twitter credentials
  const requiredEnvVars = [
    'VITE_TWITTER_API_KEY',
    'VITE_TWITTER_API_SECRET',
    'VITE_TWITTER_ACCESS_TOKEN',
    'VITE_TWITTER_ACCESS_SECRET'
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  client = new TwitterApi({
    appKey: process.env.VITE_TWITTER_API_KEY,
    appSecret: process.env.VITE_TWITTER_API_SECRET,
    accessToken: process.env.VITE_TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.VITE_TWITTER_ACCESS_SECRET,
  });

  // Verify credentials
  await client.v2.me();
} catch (error) {
  console.error('Failed to initialize Twitter client:', error.message);
  process.exit(1);
}

app.post('/api/tweet', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Tweet text is required and must be a string' });
    }

    if (text.length > 280) {
      return res.status(400).json({ error: 'Tweet text must not exceed 280 characters' });
    }

    const tweet = await client.v2.tweet(text);
    
    if (!tweet.data?.id) {
      throw new Error('Failed to get tweet ID from response');
    }

    res.json({
      success: true,
      data: tweet.data,
      tweet_url: `https://twitter.com/i/web/status/${tweet.data.id}`
    });
  } catch (error) {
    console.error('Error posting tweet:', error);
    
    // Handle Twitter API-specific errors
    if ('code' in error) {
      switch (error.code) {
        case 32:
          return res.status(401).json({ error: 'Authentication failed. Please check your Twitter credentials.' });
        case 88:
          return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        case 186:
          return res.status(400).json({ error: 'Tweet text is too long' });
        case 187:
          return res.status(400).json({ error: 'Duplicate tweet' });
        case 220:
          return res.status(401).json({ error: 'Your credentials are no longer valid. Please check your Twitter settings.' });
        case 403:
          return res.status(403).json({ error: 'You are not authorized to perform this action. Please check your Twitter app permissions.' });
        default:
          return res.status(500).json({ 
            error: 'Twitter API error',
            details: error.message,
            code: error.code
          });
      }
    }

    res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: error.message
    });
  }
});

// Create Vite server
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'spa',
});

// Use Vite's connect instance as middleware
app.use(vite.middlewares);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});