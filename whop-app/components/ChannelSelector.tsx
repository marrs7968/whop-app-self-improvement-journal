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

  useEffect(() => {
    async function fetchChannels() {
      try {
        const response = await fetch('/api/channels');
        if (response.ok) {
          const data = await response.json();
          setChannels(data);
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchChannels();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Channel
        </label>
        <div className="w-full h-10 bg-zinc-800 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Channel
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Select a channel...</option>
        {channels.map((channel) => (
          <option key={channel.id} value={channel.id}>
            {channel.name}
          </option>
        ))}
      </select>
    </div>
  );
}

