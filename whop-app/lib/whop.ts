import { whopSdk } from './whop-sdk';

export interface Channel {
  id: string;
  name: string;
}

interface ListChannelsOptions {
  companyId?: string;
  experienceId?: string;
}

interface WhopFileResponse {
  id: string;
  upload_status?: 'pending' | 'processing' | 'ready' | 'failed';
  upload_url?: string | null;
  upload_headers?: Record<string, string> | null;
  url?: string | null;
}

function getChatApiKey(): string {
  const apiKey = process.env.WHOP_COMPANY_API_KEY || process.env.WHOP_API_KEY;
  if (!apiKey) {
    throw new Error('Missing WHOP_COMPANY_API_KEY or WHOP_API_KEY');
  }
  return apiKey;
}

function normalizeChannels(raw: any): Channel[] {
  const channelNodes = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.chat_channels)
    ? raw.chat_channels
    : [];

  const unique = new Map<string, Channel>();

  for (const channel of channelNodes) {
    const id =
      channel?.id ??
      channel?.chat_channel_id ??
      channel?.channel_id ??
      channel?.slug ??
      channel?.experience?.id ??
      channel?.experience_id;

    const rawName =
      channel?.name ??
      channel?.title ??
      channel?.display_name ??
      channel?.slug ??
      channel?.experience?.name;

    if (!id) continue;

    const channelId = String(id);
    const channelName =
      rawName && String(rawName).trim()
        ? String(rawName)
        : `Channel (${channelId.slice(-5)})`;

    // If the API returns generic "Chat" labels, keep the options distinct.
    const name =
      channelName === 'Chat' && channelId
        ? `Chat (${channelId.slice(-5)})`
        : channelName;

    if (!unique.has(channelId)) {
      unique.set(channelId, { id: channelId, name });
    }
  }

  return Array.from(unique.values());
}

export async function listChannels(options: ListChannelsOptions = {}): Promise<Channel[]> {
  try {
    let companyId = options.companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    const apiKey = getChatApiKey();
    const experienceId = options.experienceId;

    if (!companyId && experienceId) {
      try {
        const experience = await whopSdk.experiences.getExperience({ experienceId });
        companyId =
          (experience as any)?.company_id ??
          (experience as any)?.companyId ??
          (experience as any)?.company?.id ??
          undefined;
      } catch (resolveCompanyError) {
        console.error('Could not resolve company from experience context:', resolveCompanyError);
      }
    }

    if (companyId && apiKey) {
      const response = await fetch(
        `https://api.whop.com/api/v1/chat_channels?company_id=${encodeURIComponent(companyId)}&limit=100`,
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
    const apiKey = getChatApiKey();
    const filename = (file as File).name || `upload-${Date.now()}`;
    const contentType = (file as File).type || 'application/octet-stream';
    const fileBytes = Buffer.from(await file.arrayBuffer());

    const createResp = await fetch('https://api.whop.com/api/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
      cache: 'no-store',
    });

    if (!createResp.ok) {
      throw new Error(`Failed to create file upload with status ${createResp.status}`);
    }

    const fileData = (await createResp.json()) as WhopFileResponse;
    if (!fileData?.id || !fileData?.upload_url) {
      throw new Error('File create response missing upload URL');
    }

    const uploadHeaders: Record<string, string> = {
      ...(fileData.upload_headers || {}),
      'Content-Type': contentType,
    };

    const uploadResp = await fetch(fileData.upload_url, {
      method: 'PUT',
      headers: uploadHeaders,
      body: fileBytes,
    });

    if (!uploadResp.ok) {
      throw new Error(`Failed to upload file bytes with status ${uploadResp.status}`);
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      const statusResp = await fetch(`https://api.whop.com/api/v1/files/${encodeURIComponent(fileData.id)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!statusResp.ok) {
        throw new Error(`Failed to retrieve file status with status ${statusResp.status}`);
      }

      const statusData = (await statusResp.json()) as WhopFileResponse;
      if (statusData.upload_status === 'ready') {
        return statusData.id;
      }
      if (statusData.upload_status === 'failed') {
        throw new Error('Uploaded file failed processing');
      }

      await new Promise((resolve) => setTimeout(resolve, 750));
    }

    return fileData.id;
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
    const apiKey = getChatApiKey();

    const payload = {
      channel_id: channelId,
      content: text?.trim() ? text : ' ',
      attachments: (mediaIds || []).map((id) => ({ id })),
    };

    const response = await fetch('https://api.whop.com/api/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create chat message (${response.status}): ${errorText}`);
    }
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

