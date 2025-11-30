import UserList, { UserListItem } from '@/src/components/UserList';
import { getFollowers } from '@/src/server/users';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

export default function FollowersScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowers = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await getFollowers(userId);
    if (error) {
      setError(error.message);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  return (
    <UserList
      users={users}
      loading={loading}
      error={error}
      onRefresh={fetchFollowers}
      emptyMessage="No followers yet"
    />
  );
}

