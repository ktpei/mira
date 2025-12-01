import Colors from '@/constants/Colors';
import { executeSQLFunction } from '@/lib/supabase';
import PostFeedItem, { PostFeedItemProps } from '@/src/components/PostFeedItem';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import { deletePost } from '@/src/server/posts';
import { getFollowerCount, getFollowingCount, getUserProfile, toggleFollow, type UserProfile } from '@/src/server/users';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PostData {
  out_post_id: number;
  caption: string | null;
  captured_at: string;
  uploaded_at: string;
  photo_urls: string[];
  like_count: number;
  comment_count: number;
  is_liked_by_user: boolean;
  visibility: string;
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostFeedItemProps[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === userId;

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { profile: profileData, error: profileError } = await getUserProfile(userId);
      
      if (profileError) {
        setError(profileError.message || 'Failed to load profile');
        setLoading(false);
        return;
      }

      setProfile(profileData);
      
      // Fetch counts
      const [followersData, followingData] = await Promise.all([
        getFollowerCount(userId),
        getFollowingCount(userId)
      ]);

      if (!followersData.error) setFollowersCount(followersData.count);
      if (!followingData.error) setFollowingCount(followingData.count);

      // Fetch posts
      await fetchPosts();
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!userId || !currentUser?.id) return;

    try {
      const { data, error: rpcError } = await executeSQLFunction<PostData[]>(
        'get_user_posts1',
        {
          p_current_user_id: currentUser.id,
          p_limit: 20,
          p_offset: 0,
          p_profile_user_id: userId
        }
      );

      if (rpcError) {
        console.error('Error fetching posts:', rpcError);
        return;
      }

      if (data) {
        const mappedPosts: PostFeedItemProps[] = data.map((post) => ({
          post_id: post.out_post_id,
          caption: post.caption,
          uploaded_at: post.uploaded_at,
          captured_at: post.captured_at,
          user_id: userId,
          username: profile?.username || 'User',
          profile_pic: profile?.profile_pic || 'https://via.placeholder.com/100',
          handle: null,
          photo_urls: post.photo_urls && post.photo_urls.length > 0
            ? post.photo_urls
            : ['https://via.placeholder.com/400x400'],
          photo_width: null,
          photo_height: null,
          like_count: post.like_count,
          comment_count: post.comment_count,
          is_liked: post.is_liked_by_user,
        }));

        const sortedPosts = mappedPosts.sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        );

        setPosts(sortedPosts);
      }
    } catch (err: any) {
      console.error('Error fetching posts:', err);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser?.id || !userId) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }

    setFollowLoading(true);
    try {
      const { success, action, newFollowerCount, error: followError } = await toggleFollow(
        currentUser.id,
        userId
      );

      if (followError) {
        Alert.alert('Error', followError.message || 'Failed to update follow status');
        return;
      }

      if (success) {
        setIsFollowing(action === 'followed');
        setFollowersCount(newFollowerCount);
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to delete posts');
      return;
    }

    try {
      const { data, error } = await deletePost(postId, currentUser.id);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to delete post');
        return;
      }

      if (data && data.length > 0 && data[0].success) {
        setPosts((prev) => prev.filter((post) => post.post_id !== postId));
        Alert.alert('Success', 'Post deleted successfully');
      } else {
        Alert.alert('Error', data?.[0]?.message || 'Failed to delete post');
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const renderHeader = () => {
    if (!profile) return null;

    const displayName = profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : 'User';

    return (
      <View style={styles.header}>
        {/* Profile Picture and Stats */}
        <View style={styles.topSection}>
          <View style={styles.profilePictureContainer}>
            <Image
              source={{ uri: profile.profile_pic || 'https://via.placeholder.com/100' }}
              style={[styles.profilePicture, { borderColor: colors.border }]}
            />
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {posts.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>posts</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                router.push({
                  pathname: '/screens/followers',
                  params: { userId }
                });
              }}
            >
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {followersCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                router.push({
                  pathname: '/screens/following',
                  params: { userId }
                });
              }}
            >
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {followingCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Username and Bio */}
        <View style={styles.infoSection}>
          <Text style={[styles.username, { color: colors.text }]}>
            {profile.username || 'user'}
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {displayName}
          </Text>
          {profile.bio && (
            <Text style={[styles.bio, { color: colors.text }]}>
              {profile.bio}
            </Text>
          )}
        </View>

        {/* Action Button */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: isFollowing ? colors.secondaryBackground : colors.tint,
                borderColor: colors.border,
              }
            ]}
            onPress={handleToggleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? colors.text : '#fff'} />
            ) : (
              <>
                <FontAwesome
                  name={isFollowing ? 'check' : 'user-plus'}
                  size={16}
                  color={isFollowing ? colors.text : '#fff'}
                />
                <Text
                  style={[
                    styles.followButtonText,
                    { color: isFollowing ? colors.text : '#fff' }
                  ]}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <FontAwesome name="exclamation-circle" size={48} color={colors.tabIconDefault} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error || 'Profile not found'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={fetchProfile}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPost = ({ item }: { item: PostFeedItemProps }) => (
    <PostFeedItem
      {...item}
      current_user_id={currentUser?.id || null}
      onDelete={isOwnProfile ? handleDeletePost : undefined}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.text }]}>
        No posts yet
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          title: profile?.username || 'Profile',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.post_id.toString()}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={posts.length === 0 ? styles.emptyListContainer : undefined}
        refreshing={loading}
        onRefresh={fetchProfile}
      />
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePictureContainer: {
    marginRight: 16,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  infoSection: {
    marginBottom: 16,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
  },
});

