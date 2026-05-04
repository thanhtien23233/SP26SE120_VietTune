import { assertSupabaseConfigured, supabase } from './supabaseClient';

import { logServiceError, logServiceInfo, logServiceWarn } from '@/services/serviceLogger';

/**
 * Uploads an audio or video file to the Supabase specified bucket and returns the public URL.
 *
 * @param file The file object to upload
 * @param bucketName The name of the Supabase storage bucket
 * @returns The public URL of the uploaded file
 */
export const uploadFileToSupabase = async (
  file: File,
  bucketName: string = import.meta.env.VITE_SUPABASE_BUCKET || 'audio',
): Promise<string> => {
  try {
    assertSupabaseConfigured();
    if (!supabase) throw new Error('Supabase client is not configured.');
    // Generate a unique file name to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload the file to Supabase storage
    const { error } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      logServiceError('Supabase upload error', error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    logServiceError('Error uploading file to Supabase', error);
    throw error;
  }
};

/**
 * Deletes a file from the Supabase specified bucket using its public URL.
 *
 * @param publicUrl The public URL of the file to delete
 * @param bucketName The name of the Supabase storage bucket
 */
export const deleteFileFromSupabase = async (
  publicUrl: string,
  _defaultBucketName: string = 'VietTuneArchive',
): Promise<void> => {
  try {
    assertSupabaseConfigured();
    if (!supabase) return;
    if (!publicUrl) {
      logServiceWarn('[Supabase Delete] No URL provided');
      return;
    }

    // 1. Parse URL to get bucket and path
    // Example: https://.../storage/v1/object/public/BucketName/folder/file.mp3
    const parts = publicUrl.split('/');
    const publicIndex = parts.indexOf('public');
    const filenameFromUrl = parts[parts.length - 1];

    let bucketName = _defaultBucketName;
    let filePath = filenameFromUrl;

    if (publicIndex !== -1 && parts.length > publicIndex + 2) {
      bucketName = parts[publicIndex + 1];
      filePath = parts.slice(publicIndex + 2).join('/');
    }

    logServiceInfo(`[Supabase Delete] Attempting deletion...
      URL: ${publicUrl}
      Bucket: ${bucketName}
      Path: ${filePath}`);

    // Attempt 1: Standard path (no leading slash)
    const { data: d1, error: e1 } = await supabase.storage.from(bucketName).remove([filePath]);

    if (e1) {
      logServiceError(`[Supabase Delete] Attempt 1 Error (${filePath})`, e1.message);
    } else if (d1 && d1.length > 0) {
      logServiceInfo('[Supabase Delete] Success (Attempt 1)', d1);
      return;
    } else {
      logServiceWarn(
        '[Supabase Delete] Attempt 1 returned empty data (not found or permission denied)',
      );
    }

    // Attempt 2: Path with leading slash (some older versions or specific setups)
    const altPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    logServiceInfo(`[Supabase Delete] Attempt 2 with leading slash: ${altPath}`);
    const { data: d2, error: e2 } = await supabase.storage.from(bucketName).remove([altPath]);

    if (!e2 && d2 && d2.length > 0) {
      logServiceInfo('[Supabase Delete] Success (Attempt 2)', d2);
      return;
    }

    // Attempt 3: Just the filename in the default bucket (Final fallback)
    if (filePath !== filenameFromUrl || bucketName !== _defaultBucketName) {
      logServiceInfo(
        `[Supabase Delete] Attempt 3 (Fallback) using filename in default bucket: ${filenameFromUrl}`,
      );
      const { data: d3, error: e3 } = await supabase.storage
        .from(_defaultBucketName)
        .remove([filenameFromUrl]);

      if (!e3 && d3 && d3.length > 0) {
        logServiceInfo('[Supabase Delete] Success (Attempt 3)', d3);
        return;
      }
    }

    logServiceError(
      `[Supabase Delete] All attempts failed for ${publicUrl}. Check if the file exists and if the ANON key has DELETE permissions for bucket '${bucketName}'.`,
    );
  } catch (error) {
    logServiceError('[Supabase Delete] unexpected crash', error);
  }
};
