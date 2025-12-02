import { executeSQLFunction, supabase } from './supabase';

export interface UserProfile {
  user_id: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  profile_pic?: string | null;
  updated_at?: string;
}

export interface UserCard {
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
  data: UserCard[] | null;
  error: any;
}> {
  return executeSQLFunction<UserCard[]>('get_user_followers', { p_user_id: userId });
}

export async function getFollowing(userId: string): Promise<{
  data: UserCard[] | null;
  error: any;
}> {
  return executeSQLFunction<UserCard[]>('get_user_following', { p_user_id: userId });
}

export async function getFollowerCount(userId: string): Promise<{
  count: number;
  error: any;
}> {
  const { data, error } = await executeSQLFunction<number>('get_follower_count', { p_user_id: userId });
  return { count: data ?? 0, error };
}

export async function getFollowingCount(userId: string): Promise<{
  count: number;
  error: any;
}> {
  const { data, error } = await executeSQLFunction<number>('get_following_count', { p_user_id: userId });
  return { count: data ?? 0, error };
}

interface ToggleFollowResult {
  success: boolean;
  action: string; // 'followed' or 'unfollowed'
  new_follower_count: number;
}

/**
 * Toggle follow relationship between two users
 * 
 * @param followerId - UUID of the user who is following (current user)
 * @param followeeId - UUID of the user being followed/unfollowed
 * @returns Result with success status, action taken, and new follower count
 */
export async function toggleFollow(
  followerId: string,
  followeeId: string
): Promise<{
  success: boolean;
  action: string | null;
  newFollowerCount: number;
  error: any;
}> {
  try {
    const { data, error } = await executeSQLFunction<ToggleFollowResult[]>(
      'toggle_follow',
      {
        p_follower_id: followerId, // UUID as string
        p_followee_id: followeeId, // UUID as string
      }
    );

    if (error) {
      console.error('Error toggling follow:', error);
      return {
        success: false,
        action: null,
        newFollowerCount: 0,
        error,
      };
    }

    const result = data?.[0];
    if (!result) {
      return {
        success: false,
        action: null,
        newFollowerCount: 0,
        error: { message: 'No result returned from toggle_follow' },
      };
    }

    return {
      success: result.success,
      action: result.action,
      newFollowerCount: result.new_follower_count,
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error toggling follow:', err);
    return {
      success: false,
      action: null,
      newFollowerCount: 0,
      error: { message: err.message || 'Failed to toggle follow' },
    };
  }
}

/**
 * Remove a follower (current user removes someone who is following them)
 * 
 * @param currentUserId - UUID of the current user (the followee)
 * @param followerId - UUID of the user to remove as a follower
 * @returns Result with success status
 */
export async function removeFollower(
  currentUserId: string,
  followerId: string
): Promise<{
  success: boolean;
  error: any;
}> {
  try {
    // Reverse the parameters: follower_id is the one to remove, followee_id is current user
    const { data, error } = await executeSQLFunction<ToggleFollowResult[]>(
      'toggle_follow',
      {
        p_follower_id: followerId, // The person who is following (to be removed)
        p_followee_id: currentUserId, // Current user (the one being followed)
      }
    );

    if (error) {
      console.error('Error removing follower:', error);
      return {
        success: false,
        error,
      };
    }

    const result = data?.[0];
    if (!result || !result.success) {
      return {
        success: false,
        error: { message: 'Failed to remove follower' },
      };
    }

    // Only succeed if the action was 'unfollowed' (meaning they were following)
    return {
      success: result.action === 'unfollowed',
      error: result.action !== 'unfollowed' ? { message: 'User was not following you' } : null,
    };
  } catch (err: any) {
    console.error('Unexpected error removing follower:', err);
    return {
      success: false,
      error: { message: err.message || 'Failed to remove follower' },
    };
  }
}

/**
 * Unfollow a user (current user stops following someone)
 * 
 * @param currentUserId - UUID of the current user (the follower)
 * @param followeeId - UUID of the user to unfollow
 * @returns Result with success status
 */
export async function unfollow(
  currentUserId: string,
  followeeId: string
): Promise<{
  success: boolean;
  error: any;
}> {
  try {
    const { data, error } = await executeSQLFunction<ToggleFollowResult[]>(
      'toggle_follow',
      {
        p_follower_id: currentUserId, // Current user (the follower)
        p_followee_id: followeeId, // The person being unfollowed
      }
    );

    if (error) {
      console.error('Error unfollowing user:', error);
      return {
        success: false,
        error,
      };
    }

    const result = data?.[0];
    if (!result || !result.success) {
      return {
        success: false,
        error: { message: 'Failed to unfollow user' },
      };
    }

    // Only succeed if the action was 'unfollowed' (meaning we were following)
    return {
      success: result.action === 'unfollowed',
      error: result.action !== 'unfollowed' ? { message: 'You were not following this user' } : null,
    };
  } catch (err: any) {
    console.error('Unexpected error unfollowing user:', err);
    return {
      success: false,
      error: { message: err.message || 'Failed to unfollow user' },
    };
  }
}

/**
 * Create a new user profile
 * 
 * @param userId - UUID of the user from auth.users
 * @param username - Optional username (will be generated from email if not provided)
 * @param email - User's email (used to generate username if needed)
 * @returns Result with success status
 */
export async function createProfile(
  userId: string,
  email: string,
  username?: string
): Promise<{
  success: boolean;
  error: any;
}> {
  try {
    console.log('Creating profile for user:', userId, 'email:', email, 'username:', username);
    
    // Generate username from email if not provided
    let finalUsername = username?.trim();
    if (!finalUsername || finalUsername.length === 0) {
      // Extract username from email (part before @)
      const emailUsername = email.split('@')[0].toLowerCase();
      // Remove any non-alphanumeric characters and ensure it's at least 3 chars
      const cleanUsername = emailUsername.replace(/[^a-z0-9]/g, '').substring(0, 20);
      finalUsername = cleanUsername.length >= 3 ? cleanUsername : `user${Date.now().toString().slice(-6)}`;
    }

    // Ensure username meets minimum length requirement (3 chars per schema)
    if (finalUsername.length < 3) {
      finalUsername = `user${Date.now().toString().slice(-6)}`;
    }

    console.log('Generated username:', finalUsername);

    // Check if username already exists, if so append numbers
    let uniqueUsername = finalUsername;
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', uniqueUsername)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors

      if (checkError) {
        console.error('Error checking username uniqueness:', checkError);
        // If it's a permission error, we'll try to insert anyway
        if (!checkError.message?.includes('permission') && !checkError.message?.includes('row-level security')) {
          break;
        }
      }

      if (!existing) {
        break; // Username is available
      }

      // Username exists, append random numbers
      uniqueUsername = `${finalUsername}${Math.floor(Math.random() * 10000)}`;
      attempts++;
      console.log(`Username ${finalUsername} exists, trying: ${uniqueUsername}`);
    }

    console.log('Final unique username:', uniqueUsername);

    // Insert the profile
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        username: uniqueUsername,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (insertError) {
      console.error('Error creating profile - Full error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });
      return { 
        success: false, 
        error: {
          message: insertError.message || 'Failed to create profile',
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        }
      };
    }

    console.log('Profile created successfully:', insertData);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Unexpected error creating profile:', err);
    return {
      success: false,
      error: { 
        message: err.message || 'Failed to create profile',
        stack: err.stack,
      },
    };
  }
}

/**
 * Update user profile
 * 
 * @param userId - UUID of the user
 * @param updates - Object with profile fields to update
 * @returns Result with success status
 */
export async function updateProfile(
  userId: string,
  updates: {
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    bio?: string | null;
    profile_pic?: string | null;
  }
): Promise<{
  success: boolean;
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Unexpected error updating profile:', err);
    return {
      success: false,
      error: { message: err.message || 'Failed to update profile' },
    };
  }
}
