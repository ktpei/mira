import { StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';

import Colors from '@/constants/Colors';
import PostFeedItem, { PostFeedItemProps } from '@/src/components/PostFeedItem';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import { getFeedPosts } from '@/src/server/posts';
import { useEffect, useState } from 'react';

export default function FeedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, profile, loading: authLoading } = useAuth();
  
  const [posts, setPosts] = useState<PostFeedItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const POSTS_PER_PAGE = 20;

  const fetchFeedPosts = async (reset: boolean = false) => {
    if (!user?.id) {
      setError('You must be logged in to view the feed');
      setLoading(false);
      return;
    }

    try {
      if (reset) {
        setRefreshing(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const { data, error: fetchError } = await getFeedPosts(
        user.id,
        POSTS_PER_PAGE,
        currentOffset
      );

      if (fetchError) {
        console.error('Error fetching feed posts:', fetchError);
        setError(fetchError.message || 'Failed to load feed');
        return;
      }

      if (data) {
        if (reset) {
          setPosts(data);
        } else {
          setPosts((prev) => [...prev, ...data]);
        }

        // Check if there are more posts to load
        setHasMore(data.length === POSTS_PER_PAGE);
        setOffset(currentOffset + data.length);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user?.id && !authLoading) {
      fetchFeedPosts(true);
    }
  }, [user?.id, authLoading]);

  const handleRefresh = () => {
    fetchFeedPosts(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !refreshing) {
      fetchFeedPosts(false);
    }
  };

  const renderPost = ({ item }: { item: PostFeedItemProps }) => (
    <PostFeedItem {...item} />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.emptyText, { color: colors.tabIconDefault, marginTop: 16 }]}>
            Loading feed...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: '#ff3040' }]}>
            {error}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
          No posts yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.tabIconDefault }]}>
          Follow users or create posts to see them here
        </Text>
      </View>
    );
  };

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id.toString()}
        contentContainerStyle={posts.length === 0 ? styles.emptyListContainer : undefined}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
