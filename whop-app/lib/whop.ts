import { whopSdk } from './whop-sdk';

export interface Channel {
  id: string;
  name: string;
}

interface ListChannelsOptions {
  companyId?: string;
  experienceId?: string;
}

function normalizeChannels(raw: any): Channel[] {
  const channelNodes = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.chat_channels)
    ? raw.chat_channels
    : [];

  return channelNodes
    .map((channel: any) => {
      const id = channel?.id ?? channel?.chat_channel_id ?? channel?.experience_id;
      const name = channel?.name ?? channel?.title ?? channel?.display_name;

      if (!id || !name) return null;
      return {
        id: String(id),
        name: String(name),
      };
    })
    .filter(Boolean) as Channel[];
}

export async function listChannels(options: ListChannelsOptions = {}): Promise<Channel[]> {
  try {
    const companyId = options.companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    const apiKey = process.env.WHOP_API_KEY;
    const experienceId = options.experienceId;

    if (companyId && apiKey) {
      const response = await fetch(
        `https://api.whop.com/api/v1/chat_channels?company_id=${encodeURIComponent(companyId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (response.ok) {
        const raw = await response.json();
        const channels = normalizeChannels(raw);
        if (channels.length > 0) {
          return channels;
        }
      } else {
        console.error(`Chat channel request failed with status ${response.status}`);
      }
    }

    // Fallback: expose the current experience chat as an option.
    if (experienceId) {
      try {
        const experience = await whopSdk.experiences.getExperience({ experienceId });
        const fallbackName =
          (experience as any)?.name ||
          (experience as any)?.title ||
          'Current Community Chat';

        return [{ id: experienceId, name: String(fallbackName) }];
      } catch (fallbackError) {
        console.error('Experience fallback failed during channel discovery:', fallbackError);
      }
    }

    return [];
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
}

export async function uploadMedia(file: File | Blob): Promise<string> {
  try {
    // This would need to be implemented based on Whop's upload API
    // For now, return a mock media ID
    const mockMediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return mockMediaId;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error('Failed to upload media');
  }
}

export async function postToChannel(
  channelId: string, 
  text: string, 
  mediaIds: string[]
): Promise<void> {
  try {
    // This would need to be implemented based on Whop's API
    // For now, just log the action
    console.log('Posting to channel:', {
      channelId,
      text,
      mediaIds
    });
    
    // In a real implementation, this would call Whop's API to post the message
    // with the text and attached media IDs to the selected channel
    
  } catch (error) {
    console.error('Error posting to channel:', error);
    throw new Error('Failed to post to channel');
  }
}

export async function getUserInfo(userId: string) {
  try {
    const user = await whopSdk.users.getUser({ userId });
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      whopUserId: user.id
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw new Error('Failed to fetch user info');
  }
}

