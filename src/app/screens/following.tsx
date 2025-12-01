import UserList, { UserCard } from '@/src/components/UserList';
import { useAuth } from '@/src/contexts/AuthContext';
import { getFollowing, unfollow } from '@/src/server/users';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

export default function FollowingScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unfollowing, setUnfollowing] = useState<string | null>(null);

  const fetchFollowing = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await getFollowing(userId);
    if (error) {
      setError(error.message);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleUnfollow = async (followeeId: string) => {
    if (!user?.id || !userId) return;
    
    // Only allow unfollowing if viewing your own following list
    if (user.id !== userId) {
      setError('You can only unfollow from your own following list');
      return;
    }

    if (unfollowing) return; // Prevent multiple simultaneous unfollows

    setUnfollowing(followeeId);
    setError(null);

    try {
      const { success, error: unfollowError } = await unfollow(user.id, followeeId);

      if (unfollowError) {
        setError(unfollowError.message || 'Failed to unfollow');
        return;
      }

      if (success) {
        // Remove the user from the list
        setUsers((prevUsers) => prevUsers.filter((u) => u.user_id !== followeeId));
      } else {
        setError('Failed to unfollow user');
      }
    } catch (err: any) {
      console.error('Error unfollowing user:', err);
      setError('An unexpected error occurred');
    } finally {
      setUnfollowing(null);
    }
  };

  useEffect(() => {
    fetchFollowing();
  }, [userId]);

  // Check if current user is viewing their own following list
  const isOwnProfile = user?.id === userId;

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Following',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <UserList
        users={users}
        loading={loading}
        error={error}
        onRefresh={fetchFollowing}
        emptyMessage="Not following anyone yet"
        showActionButton={isOwnProfile}
        actionButtonLabel="Unfollow"
        onActionPress={handleUnfollow}
        actionButtonLoading={unfollowing}
      />
    </>
  );
}

