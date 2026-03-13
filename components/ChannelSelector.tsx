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
}

export function ChannelSelector({ value, onChange, disabled = false }: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function fetchChannels() {
      try {
        const response = await fetch('/api/channels');
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
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-emerald-100/90 mb-2">
          Channel
        </label>
        <div className="w-full h-10 bg-zinc-900/70 border border-emerald-500/20 rounded-lg animate-pulse"></div>
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
        className="w-full h-10 px-3 bg-zinc-900/70 border border-emerald-400/35 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 focus:border-emerald-300/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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


