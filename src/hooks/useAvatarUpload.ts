import React from 'react';
import { supabase } from '../supabase';

export interface UseAvatarUploadOptions {
  /** Storage path under the `avatars` bucket, e.g. `${userId}/avatar.${ext}`. */
  buildPath: (ext: string) => string;
  /** Called with the new public URL (cache-busted) after a successful upload. */
  onUploaded: (url: string) => void | Promise<void>;
}

export interface UseAvatarUploadResult {
  uploading: boolean;
  upload:    (file: File) => Promise<void>;
}

/**
 * Shared avatar upload logic — uploads to the `avatars` Storage bucket,
 * resolves the cache-busted public URL, and hands it to `onUploaded`
 * (which is responsible for any UI state update and persistence).
 */
export function useAvatarUpload({ buildPath, onUploaded }: UseAvatarUploadOptions): UseAvatarUploadResult {
  const [uploading, setUploading] = React.useState(false);

  const upload = React.useCallback(async (file: File) => {
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = buildPath(ext);
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (!error) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        await onUploaded(`${urlData.publicUrl}?t=${Date.now()}`);
      }
    } finally {
      setUploading(false);
    }
  }, [buildPath, onUploaded]);

  return { uploading, upload };
}
