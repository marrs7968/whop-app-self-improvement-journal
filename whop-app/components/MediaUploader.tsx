'use client';

import { useEffect, useRef, useState } from 'react';

interface MediaUploaderProps {
  mediaIds: string[];
  onChange: (mediaIds: string[]) => void;
  disabled?: boolean;
}

export function MediaUploader({ mediaIds, onChange, disabled = false }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<
    Array<{ localId: string; name: string; type: string; previewUrl?: string }>
  >([]);
  const [mediaMetaById, setMediaMetaById] = useState<
    Record<string, { name: string; type: string; previewUrl?: string }>
  >({});
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaMetaRef = useRef(mediaMetaById);
  const pendingUploadsRef = useRef(pendingUploads);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const pendingItems = selectedFiles.map((file, index) => ({
      localId: `${Date.now()}-${index}`,
      name: file.name,
      type: file.type,
      previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/')
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setUploadError('');
    setPendingUploads((prev) => [...prev, ...pendingItems]);
    setUploading(true);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
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
        return {
          mediaId: data.mediaId as string,
          meta: {
            name: file.name,
            type: file.type,
            previewUrl: pendingItems[index]?.previewUrl,
          },
        };
      });

      const uploads = await Promise.all(uploadPromises);
      const newMediaIds = uploads.map((upload) => upload.mediaId);

      setMediaMetaById((prev) => {
        const next = { ...prev };
        for (const upload of uploads) {
          next[upload.mediaId] = upload.meta;
        }
        return next;
      });

      onChange([...mediaIds, ...newMediaIds]);
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadError('Upload failed. Please try again.');
      pendingItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    } finally {
      setPendingUploads((prev) =>
        prev.filter((item) => !pendingItems.some((pending) => pending.localId === item.localId))
      );
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeMedia = (index: number) => {
    const mediaId = mediaIds[index];
    const meta = mediaMetaById[mediaId];
    if (meta?.previewUrl) {
      URL.revokeObjectURL(meta.previewUrl);
    }
    setMediaMetaById((prev) => {
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });
    const newMediaIds = mediaIds.filter((_, i) => i !== index);
    onChange(newMediaIds);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    mediaMetaRef.current = mediaMetaById;
  }, [mediaMetaById]);

  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      Object.values(mediaMetaRef.current).forEach((meta) => {
        if (meta.previewUrl) URL.revokeObjectURL(meta.previewUrl);
      });
      pendingUploadsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-emerald-100/90 mb-2">
        Media (Images & Videos)
      </label>

      <button
        type="button"
        onClick={openFileDialog}
        disabled={disabled || uploading}
        className="w-full h-20 border-2 border-dashed border-emerald-300/60 bg-zinc-800/85 hover:border-emerald-200/80 hover:bg-zinc-800 rounded-lg flex flex-col items-center justify-center text-emerald-100/85 hover:text-emerald-50 transition-all shadow-[0_0_0_1px_rgba(167,243,208,0.18)] active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin"></div>
            <span>Uploading media...</span>
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

      {uploadError && <p className="text-xs text-rose-300 mt-2">{uploadError}</p>}

      {(pendingUploads.length > 0 || mediaIds.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {pendingUploads.map((pending) => (
            <div key={pending.localId} className="relative w-20 h-20">
              <div className="w-20 h-20 bg-zinc-800/90 border border-emerald-300/40 rounded-lg overflow-hidden flex items-center justify-center">
                {pending.previewUrl && pending.type.startsWith('image/') ? (
                  <img src={pending.previewUrl} alt={pending.name} className="w-full h-full object-cover opacity-60" />
                ) : pending.previewUrl && pending.type.startsWith('video/') ? (
                  <video src={pending.previewUrl} className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="text-emerald-100/60 text-xs text-center px-2 break-words">
                    {pending.name}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-zinc-950/60 rounded-lg flex items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-emerald-100">
                  <div className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin"></div>
                  Uploading
                </div>
              </div>
            </div>
          ))}

          {mediaIds.map((mediaId, index) => (
            <div key={mediaId} className="relative group w-20 h-20">
              <div className="w-20 h-20 bg-zinc-800/90 border border-emerald-300/40 rounded-lg overflow-hidden flex items-center justify-center">
                {mediaMetaById[mediaId]?.previewUrl && mediaMetaById[mediaId].type.startsWith('image/') ? (
                  <img
                    src={mediaMetaById[mediaId].previewUrl}
                    alt={mediaMetaById[mediaId].name}
                    className="w-full h-full object-cover"
                  />
                ) : mediaMetaById[mediaId]?.previewUrl && mediaMetaById[mediaId].type.startsWith('video/') ? (
                  <video src={mediaMetaById[mediaId].previewUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <div className="text-emerald-100/70 text-xs text-center px-2 break-words">
                    {mediaMetaById[mediaId]?.name || `Attached media ${index + 1}`}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeMedia(index)}
                disabled={disabled}
                className="absolute -top-2 -right-2 w-7 h-7 bg-zinc-950 border border-rose-300/70 hover:border-rose-300 text-rose-200 rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.4)] active:translate-y-px disabled:opacity-50"
                aria-label="Remove media"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {mediaIds.length > 0 && (
        <p className="text-xs text-emerald-100/70 mt-2">
          {mediaIds.length} file{mediaIds.length > 1 ? 's' : ''} attached
        </p>
      )}
    </div>
  );
}


