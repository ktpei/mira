import { supabase } from '@/src/server/supabase';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Upload an image file to Supabase Storage
 * 
 * @param fileUri - Local file URI (from expo-image-picker)
 * @param bucketName - Name of the Supabase Storage bucket (default: 'posts')
 * @param userId - User ID for organizing files
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToStorage(
  fileUri: string,
  bucketName: string = 'posts',
  userId: string
): Promise<string> {
  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('You must be logged in to upload images. Please sign in and try again.');
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileUri.split('.').pop() || 'jpg';
    // Use the authenticated user's ID from the session, not the passed userId
    const authenticatedUserId = session.user.id;
    const fileName = `${authenticatedUserId}/${timestamp}-${randomString}.${fileExtension}`;

    // Read the file as base64 (React Native compatible)
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    // Convert base64 to ArrayBuffer for Supabase
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const arrayBuffer = byteArray.buffer;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExtension}`,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('Error uploading image:', error);
      if (error.message.includes('row-level security')) {
        throw new Error(
          'Storage permission denied. Please ensure:\n' +
          `1. The "${bucketName}" bucket exists in Supabase Storage\n` +
          '2. Storage policies are set up (run setupStoragePolicies.sql)\n' +
          '3. You are logged in'
        );
      }
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Error in uploadImageToStorage:', error);
    throw error;
  }
}

/**
 * Upload multiple images to Supabase Storage
 * 
 * @param fileUris - Array of local file URIs
 * @param bucketName - Name of the Supabase Storage bucket (default: 'posts')
 * @param userId - User ID for organizing files
 * @returns Array of public URLs
 */
export async function uploadMultipleImagesToStorage(
  fileUris: string[],
  bucketName: string = 'posts',
  userId: string
): Promise<string[]> {
  try {
    const uploadPromises = fileUris.map((uri) =>
      uploadImageToStorage(uri, bucketName, userId)
    );
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error: any) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
}

