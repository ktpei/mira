import type { User } from '@supabase/supabase-js';
import { executeSQLFunction } from './supabase';

export type Visibility = 'public' | 'private' | 'friends';

export interface CreatePostParams {
  caption: string;
  visibility: Visibility;
  locationId?: string | null;
  capturedAt?: Date | string;
  user: User;
}

export interface CreatePostResult {
  postID: number;
  caption: string;
  uploadedAt: string;
}

/**
 * Creates a new post in the database
 * 
 * @param params - Post creation parameters
 * @returns The created post data or an error
 */
export async function createPost(
  params: CreatePostParams
): Promise<{ data: CreatePostResult[] | null; error: any }> {
  const { caption, visibility, locationId, capturedAt, user } = params;

  // TODO: Get user_id from your users table based on auth user.id (UUID)
  // For now, using a placeholder - you'll need to map auth UUID to your user_id bigint
  // Example: const user_id = await getUserByIdFromAuthId(user.id);
  const user_id = 1; // Replace with actual user_id lookup

  try {
    const { data, error } = await executeSQLFunction<CreatePostResult[]>('create_post', {
      p_user_id: user_id,
      p_caption: caption.trim() || null,
      p_location_id: locationId ? parseInt(locationId, 10) : null,
      p_captured_at: capturedAt 
        ? (typeof capturedAt === 'string' ? capturedAt : capturedAt.toISOString())
        : new Date().toISOString(),
      p_visibility: visibility,
    });

    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'An unexpected error occurred' },
    };
  }
}

