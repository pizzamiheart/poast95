export async function postTweet(text: string) {
  const response = await fetch('/.netlify/functions/tweet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to post tweet');
  }

  return response.json();
}