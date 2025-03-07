export async function postTweet(text: string) {
  try {
    console.log('Attempting to post tweet to serverless function');
    
    const response = await fetch('/.netlify/functions/tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    console.log('Response from serverless function:', {
      status: response.status,
      statusText: response.statusText,
      data
    });

    if (!response.ok) {
      console.error('Error response from serverless function:', data);
      throw new Error(data.error || `Failed to post tweet: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Error in postTweet:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to post tweet: ${error.message}`);
    }
    throw new Error('Failed to post tweet: Unknown error');
  }
}