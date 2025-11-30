import { executeSQLFunction } from './supabase';

export interface UserProfile {
  user_id: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  profile_pic?: string | null;
  updated_at?: string;
}

export interface UserListItem {
  user_id: string;
  username: string;
  full_name: string | null;
  profile_pic: string | null;
}

/**
 * Get full user profile by auth user UUID
 * 
 * @param authUserId - The UUID from auth.users.id
 * @returns The user profile or null if not found
 */
export async function getUserProfile(userId: string): Promise<{ 
  profile: UserProfile | null; 
  error: any;
}> {
  try {
    const { data, error } = await executeSQLFunction<UserProfile[]>(
      'get_user_profile',
      { p_user_id: userId }
    );

    if (error) {
      console.error('Error getting user profile:', error);
      return { profile: null, error };
    }

    return { profile: data?.[0] ?? null, error: null };
  } catch (err: any) {
    console.error('Unexpected error getting user profile:', err);
    return { profile: null, error: { message: err.message || 'Failed to get user profile' } };
  }
}

export async function getFollowers(userId: string): Promise<{
  data: UserListItem[] | null;
  error: any;
}> {
  return executeSQLFunction<UserListItem[]>('get_user_followers', { p_user_id: userId });
}

export async function getFollowing(userId: string): Promise<{
  data: UserListItem[] | null;
  error: any;
}> {
  return executeSQLFunction<UserListItem[]>('get_user_following', { p_user_id: userId });
}
