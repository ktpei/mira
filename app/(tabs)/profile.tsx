import PostFeedItem, { PostFeedItemProps } from '@/components/PostFeedItem';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { executeSQLFunction } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';

// Mock current user ID - replace with actual auth later
const CURRENT_USER_ID = 1;

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
  const [posts, setPosts] = useState<PostFeedItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock profile data - replace with real data later
  const profileData = {
    user_id: CURRENT_USER_ID,
    username: 'username',
    name: 'Full Name',
    bio: 'This is a bio description\n📍 Location\n🔗 link.com',
    profile_pic: 'https://via.placeholder.com/100',
    posts: 42,
    followers: 1234,
    following: 567,
  };

  // Fetch posts from Supabase
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the PostgreSQL function
      const { data, error: rpcError } = await executeSQLFunction<PostData[]>(
        'get_user_posts1',
        { 
          p_profile_user_id: CURRENT_USER_ID,
          p_current_user_id: CURRENT_USER_ID,
          p_limit: 20,
          p_offset: 0
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
          user_id: CURRENT_USER_ID,
          username: profileData.username, // TODO: Get from user query
          profile_pic: profileData.profile_pic, // TODO: Get from user query
          handle: null, // TODO: Get from user query
          photo_url: post.photo_urls && post.photo_urls.length > 0 
            ? post.photo_urls[0] 
            : 'https://via.placeholder.com/400x400', // Fallback if no photos
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

  useEffect(() => {
    fetchPosts();
  }, []);

  const renderPost = ({ item }: { item: PostFeedItemProps }) => (
    <PostFeedItem {...item} />
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
        <TouchableOpacity 
          style={[styles.editButton, { 
            backgroundColor: colors.secondaryBackground,
            borderColor: colors.border
          }]}
        >
          <Text style={[styles.editButtonText, { color: colors.text }]}>
            Edit profile
          </Text>
        </TouchableOpacity>
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
