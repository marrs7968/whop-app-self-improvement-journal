'use client';

import { useState, useEffect } from 'react';

interface Channel {
  id: string;
  name: string;
}

interface ChannelSelectorProps {
  value?: string;
  onChange: (channelId: string) => void;
  disabled?: boolean;
  experienceId?: string;
}

export function ChannelSelector({ value, onChange, disabled = false, experienceId }: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function fetchChannels() {
      try {
        const channelUrl = experienceId
          ? `/api/channels?experienceId=${encodeURIComponent(experienceId)}`
          : '/api/channels';
        const response = await fetch(channelUrl);
        if (response.ok) {
          const data = await response.json();
          setChannels(Array.isArray(data) ? data : []);
          setLoadError('');
        } else {
          setLoadError('Could not load community chats');
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
        setLoadError('Could not load community chats');
      } finally {
        setLoading(false);
      }
    }

    fetchChannels();
  }, [experienceId]);

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-emerald-100/90 mb-2">
          Channel
        </label>
        <div className="w-full h-10 bg-zinc-800/90 border border-emerald-300/35 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-emerald-100/90 mb-2">
        Channel
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-10 px-3 bg-zinc-800/90 border border-[#d8e4d8]/55 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#b7ccb8]/70 focus:border-[#d8e4d8]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Select a channel...</option>
        {channels.length === 0 && (
          <option value="" disabled>
            No chats found for this community
          </option>
        )}
        {channels.map((channel) => (
          <option key={channel.id} value={channel.id}>
            {channel.name}
          </option>
        ))}
      </select>
      {loadError && (
        <p className="text-xs text-rose-300 mt-2">{loadError}</p>
      )}
    </div>
  );
}


