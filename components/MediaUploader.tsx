'use client';

import { useState, useRef } from 'react';

interface MediaUploaderProps {
  mediaIds: string[];
  onChange: (mediaIds: string[]) => void;
  disabled?: boolean;
}

export function MediaUploader({ mediaIds, onChange, disabled = false }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.mediaId;
      });

      const newMediaIds = await Promise.all(uploadPromises);
      onChange([...mediaIds, ...newMediaIds]);
    } catch (error) {
      console.error('Error uploading files:', error);
      // You might want to show a toast notification here
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    const newMediaIds = mediaIds.filter((_, i) => i !== index);
    onChange(newMediaIds);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Media (Images & Videos)
      </label>
      
      {/* Upload Button */}
      <button
        type="button"
        onClick={openFileDialog}
        disabled={disabled || uploading}
        className="w-full h-20 border-2 border-dashed border-zinc-600 hover:border-green-500 rounded-lg flex flex-col items-center justify-center text-zinc-400 hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm">Click to upload images or videos</span>
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Media Preview */}
      {mediaIds.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {mediaIds.map((mediaId, index) => (
            <div key={mediaId} className="relative group">
              <div className="aspect-square bg-zinc-800 rounded-lg flex items-center justify-center">
                <div className="text-zinc-500 text-sm">
                  Media {index + 1}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeMedia(index)}
                disabled={disabled}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                aria-label="Remove media"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

