import UserList, { UserListItem } from '@/src/components/UserList';
import { getFollowing } from '@/src/server/users';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

export default function FollowingScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowing = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await getFollowing(userId);
    if (error) {
      setError(error.message);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFollowing();
  }, [userId]);

  return (
    <UserList
      users={users}
      loading={loading}
      error={error}
      onRefresh={fetchFollowing}
      emptyMessage="Not following anyone yet"
    />
  );
}

