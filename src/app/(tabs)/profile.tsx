import Colors from '@/constants/Colors';
import { executeSQLFunction } from '@/lib/supabase';
import PostFeedItem, { PostFeedItemProps } from '@/src/components/PostFeedItem';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import { signOut } from '@/src/server/auth';
import { deletePost } from '@/src/server/posts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';


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

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              router.push('/screens/login');
            }
          },
        },
      ]
    );
  };
  const [posts, setPosts] = useState<PostFeedItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const profileData = {
    user_id: user?.id,
    username: profile?.username || user?.email || 'Guest',
    name: profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : 'Guest User',
    bio: profile?.bio || 'Welcome to Mira! Sign in to view your profile.',
    profile_pic: profile?.profile_pic || 'https://via.placeholder.com/100',
    posts: 0,
    followers: 0,
    following: 0,
  };

  // Fetch posts from Supabase
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Guard: Don't call the function if profile isn't loaded yet
      if (!profile?.user_id) {
        setPosts([]); // Clear posts if no profile
        setLoading(false);
        return;
      }
      
      // Call the PostgreSQL function
      const { data, error: rpcError } = await executeSQLFunction<PostData[]>(
        'get_user_posts1',
        { 
          p_current_user_id: profile.user_id,  // Remove optional chaining since we checked above
          p_limit: 20,
          p_offset: 0,
          p_profile_user_id: profile.user_id
        }
      );

      if (rpcError) {
        console.error('Error fetching posts:', rpcError);
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      if (data) {
        // Map the database response to PostFeedItemProps format
        const mappedPosts: PostFeedItemProps[] = data.map((post) => ({
          post_id: post.out_post_id,
          caption: post.caption,
          uploaded_at: post.uploaded_at,
          captured_at: post.captured_at,
          user_id: profile?.user_id ?? null,
          username: profileData.username, // TODO: Get from user query
          profile_pic: profileData.profile_pic, // TODO: Get from user query
          handle: null, // TODO: Get from user query
          photo_urls: post.photo_urls && post.photo_urls.length > 0 
            ? post.photo_urls 
            : ['https://via.placeholder.com/400x400'], // Fallback if no photos
          photo_width: null, // Not in response, will default to 1:1
          photo_height: null, // Not in response, will default to 1:1
          like_count: post.like_count,
          comment_count: post.comment_count,
          is_liked: post.is_liked_by_user,
        }));

        // Sort by uploaded_at descending (newest first)
        const sortedPosts = mappedPosts.sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        );

        setPosts(sortedPosts);
      }
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  // Update the useEffect to wait for profile to load
  useEffect(() => {
    if (profile?.user_id) {
      fetchPosts();
    } else {
      setPosts([]);
    }
  }, [profile?.user_id]); // Re-run when profile.user_id becomes available

  const handleDeletePost = async (postId: number) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to delete posts');
      return;
    }

    try {
      const { data, error } = await deletePost(postId, user.id);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to delete post');
        return;
      }

      if (data && data.length > 0 && data[0].success) {
        // Remove the post from the local state and refresh
        setPosts((prev) => prev.filter((post) => post.post_id !== postId));
        // Optionally refresh the list to update counts
        fetchPosts();
      } else {
        Alert.alert('Error', data?.[0]?.message || 'Failed to delete post');
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    }
  };

  const renderPost = ({ item }: { item: PostFeedItemProps }) => (
    <PostFeedItem 
      {...item} 
      current_user_id={user?.id || null}
      onDelete={handleDeletePost}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Profile Picture and Stats Row */}
      <View style={styles.topSection}>
        {/* Profile Picture */}
        <View style={styles.profilePictureContainer}>
          <Image
            source={{ uri: profileData.profile_pic }}
            style={[styles.profilePicture, { borderColor: colors.border }]}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {posts.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>posts</Text>
          </View>
          <TouchableOpacity style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {profileData.followers}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {profileData.following}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>following</Text>
          </TouchableOpacity>
        </View>
      </View>

        {/* Username and Edit Profile Button */}
        <View style={styles.usernameSection}>
          <Text style={[styles.username, { color: colors.text }]}>
            {profileData.username}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.editButton, { 
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
                flex: 1,
                marginRight: 8,
              }]}
            >
              <Text style={[styles.editButtonText, { color: colors.text }]}>
                Edit profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.signOutButton, { 
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
                flex: 1,
                marginLeft: 8,
              }]}
              onPress={user ? handleSignOut : () => router.push('/screens/login')}
            >
              <FontAwesome name={user ? "sign-out" : "sign-in"} size={16} color={colors.text} />
              <Text style={[styles.editButtonText, { color: colors.text, marginLeft: 6 }]}>
                {user ? "Sign Out" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      {/* Bio Section */}
      <View style={styles.bioSection}>
        <Text style={[styles.name, { color: colors.text }]}>
          {profileData.name}
        </Text>
        <Text style={[styles.bio, { color: colors.text }]}>
          {profileData.bio}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.emptyText, { color: colors.tabIconDefault, marginTop: 16 }]}>
            Loading posts...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: '#ff3040' }]}>
            Error: {error}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
          No posts yet
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={(item) => item.post_id.toString()}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      style={[styles.list, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        (posts.length === 0 || loading) && styles.emptyListContainer
      ]}
      showsVerticalScrollIndicator={false}
      refreshing={loading}
      onRefresh={fetchPosts}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePictureContainer: {
    marginRight: 20,
  },
  profilePicture: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
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
  usernameSection: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  signOutButton: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  editButton: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bioSection: {
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
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
