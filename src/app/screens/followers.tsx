import UserList, { UserCard } from '@/src/components/UserList';
import { useAuth } from '@/src/contexts/AuthContext';
import { getFollowers, removeFollower } from '@/src/server/users';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

export default function FollowersScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingFollower, setRemovingFollower] = useState<string | null>(null);

  const fetchFollowers = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await getFollowers(userId);
    if (error) {
      setError(error.message);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleRemoveFollower = async (followerId: string) => {
    if (!user?.id || !userId) return;
    
    // Only allow removing followers if viewing your own profile
    if (user.id !== userId) {
      setError('You can only remove followers from your own profile');
      return;
    }

    if (removingFollower) return; // Prevent multiple simultaneous removals

    setRemovingFollower(followerId);
    setError(null);

    try {
      const { success, error: removeError } = await removeFollower(user.id, followerId);

      if (removeError) {
        setError(removeError.message || 'Failed to remove follower');
        return;
      }

      if (success) {
        // Remove the user from the list
        setUsers((prevUsers) => prevUsers.filter((u) => u.user_id !== followerId));
      } else {
        setError('Failed to remove follower');
      }
    } catch (err: any) {
      console.error('Error removing follower:', err);
      setError('An unexpected error occurred');
    } finally {
      setRemovingFollower(null);
    }
  };

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  // Check if current user is viewing their own followers
  const isOwnProfile = user?.id === userId;

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Followers',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <UserList
        users={users}
        loading={loading}
        error={error}
        onRefresh={fetchFollowers}
        emptyMessage="No followers yet"
        showActionButton={isOwnProfile}
        actionButtonLabel="Remove"
        onActionPress={handleRemoveFollower}
        actionButtonLoading={removingFollower}
      />
    </>
  );
}

