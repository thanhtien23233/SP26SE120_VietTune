import { supabase } from "./supabaseClient";

/**
 * Uploads an audio or video file to the Supabase specified bucket and returns the public URL.
 * 
 * @param file The file object to upload
 * @param bucketName The name of the Supabase storage bucket
 * @returns The public URL of the uploaded file
 */
export const uploadFileToSupabase = async (
  file: File,
  bucketName: string = import.meta.env.VITE_SUPABASE_BUCKET || "audio"
): Promise<string> => {
  try {
    // Generate a unique file name to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload the file to Supabase storage
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error uploading file to Supabase:", error);
    throw error;
  }
};
