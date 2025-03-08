import { useAuthStore } from './store';

interface TwitterResponse {
  data: {
    id: string;
  };
}

export async function loginWithTwitter() {
  const response = await fetch('/.netlify/functions/auth');
  const data = await response.json();
  window.location.href = data.url;
}

export async function handleTwitterCallback(code: string, state: string) {
  const response = await fetch(`/.netlify/functions/callback?code=${code}&state=${state}`);
  const data = await response.json();
  
  if (response.ok) {
    useAuthStore.getState().setAuth(data.accessToken, data.username);
    return data;
  }
  
  throw new Error(data.error || 'Failed to authenticate with Twitter');
}

export async function postTweet(text: string): Promise<TwitterResponse> {
  const { accessToken } = useAuthStore.getState();
  
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await fetch('/.netlify/functions/tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to post tweet');
    }

    return data;
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
}