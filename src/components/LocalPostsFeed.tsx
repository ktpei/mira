import Colors from '@/constants/Colors';
import PostFeedItem, { PostFeedItemProps } from '@/src/components/PostFeedItem';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { getLocalPosts, type LocalPost } from '@/src/server/map';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface LocalPostsFeedProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  radiusKm?: number;
}

export default function LocalPostsFeed({
  latitude,
  longitude,
  onClose,
  radiusKm = 10,
}: LocalPostsFeedProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [posts, setPosts] = useState<PostFeedItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocalPosts();
  }, [latitude, longitude, radiusKm]);

  const fetchLocalPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await getLocalPosts(
        latitude,
        longitude,
        radiusKm,
        50,
        0
      );

      if (fetchError) {
        console.error('Error fetching local posts:', fetchError);
        setError(fetchError.message || 'Failed to load local posts');
        setPosts([]);
        return;
      }

      if (data) {
        // Map LocalPost to PostFeedItemProps
        const mappedPosts: PostFeedItemProps[] = data.map((post: LocalPost) => ({
          post_id: post.post_id,
          caption: post.caption,
          uploaded_at: post.uploaded_at,
          captured_at: post.captured_at,
          user_id: post.user_id,
          username: post.username || 'Unknown User',
          profile_pic: post.profile_pic,
          handle: null,
          photo_urls: post.photo_urls && post.photo_urls.length > 0 
            ? post.photo_urls 
            : ['https://via.placeholder.com/400x400'],
          photo_width: null,
          photo_height: null,
          like_count: post.like_count,
          comment_count: post.comment_count,
          is_liked: false, // TODO: Check if current user liked these posts
        }));

        // Sort by distance (closest first)
        const sortedPosts = mappedPosts.sort((a, b) => {
          const postA = data.find((p) => p.post_id === a.post_id);
          const postB = data.find((p) => p.post_id === b.post_id);
          return (postA?.distance_km || 0) - (postB?.distance_km || 0);
        });

        setPosts(sortedPosts);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }: { item: PostFeedItemProps }) => (
    <PostFeedItem {...item} />
  );

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Local Posts
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}>
          Within {radiusKm}km
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.secondaryBackground }]}
        onPress={onClose}
      >
        <FontAwesome name="times" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.emptyText, { color: colors.tabIconDefault, marginTop: 16 }]}>
            Loading local posts...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <FontAwesome name="exclamation-circle" size={48} color="#ff3040" />
          <Text style={[styles.emptyText, { color: '#ff3040', marginTop: 16 }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint, marginTop: 16 }]}
            onPress={fetchLocalPosts}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="map-marker" size={48} color={colors.tabIconDefault} />
        <Text style={[styles.emptyText, { color: colors.tabIconDefault, marginTop: 16 }]}>
          No posts found in this area
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.tabIconDefault }]}>
          Try clicking on a different location
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id.toString()}
        ListEmptyComponent={renderEmpty}
        style={styles.list}
        contentContainerStyle={posts.length === 0 ? styles.emptyListContainer : undefined}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchLocalPosts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: height * 0.1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

