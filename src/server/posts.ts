import type { PostFeedItemProps } from '@/src/components/PostFeedItem';
import type { User } from '@supabase/supabase-js';
import { executeSQLFunction } from './supabase';

export type Visibility = 'public' | 'private' | 'friends';

export interface FeedPostData {
  post_id: number;
  caption: string | null;
  uploaded_at: string;
  captured_at: string | null;
  photo_urls: string[];
  like_count: number;
  comment_count: number;
  user_id: string | null;
  username: string;
  profile_pic: string | null;
  handle: string | null;
  is_liked_by_user: boolean;
  visibility: string;
}

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

/**
 * Get feed posts for the current user
 * Returns public posts and posts from users the current user follows
 * 
 * @param userId - Current user's UUID
 * @param limit - Maximum number of posts to return
 * @param offset - Offset for pagination
 * @returns Feed posts data
 */
export async function getFeedPosts(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ data: PostFeedItemProps[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<FeedPostData[]>(
      'get_feed_posts',
      {
        p_current_user_id: userId,
        p_limit: limit,
        p_offset: offset,
      }
    );

    if (error) {
      console.error('Error fetching feed posts:', error);
      return { data: null, error };
    }

    if (data) {
      // Map database response to PostFeedItemProps format
      const mappedPosts: PostFeedItemProps[] = data.map((post) => ({
        post_id: post.post_id,
        caption: post.caption,
        uploaded_at: post.uploaded_at,
        captured_at: post.captured_at,
        user_id: post.user_id,
        username: post.username,
        profile_pic: post.profile_pic,
        handle: post.handle,
        photo_urls: post.photo_urls && post.photo_urls.length > 0 
          ? post.photo_urls 
          : ['https://via.placeholder.com/400x400'],
        photo_width: null,
        photo_height: null,
        like_count: post.like_count,
        comment_count: post.comment_count,
        is_liked: post.is_liked_by_user,
      }));

      return { data: mappedPosts, error: null };
    }

    return { data: [], error: null };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to fetch feed posts' },
    };
  }
}

export interface DeletePostResult {
  success: boolean;
  message: string;
}

/**
 * Delete a post
 * Only the post owner can delete their own posts
 * 
 * @param postId - Post ID to delete
 * @param userId - Current user's UUID (must match post owner)
 * @returns Success status and message
 */
export async function deletePost(
  postId: number,
  userId: string
): Promise<{ data: DeletePostResult[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<DeletePostResult[]>(
      'delete_post',
      {
        p_post_id: postId,
        p_user_id: userId,
      }
    );

    if (error) {
      console.error('Error deleting post:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to delete post' },
    };
  }
}

