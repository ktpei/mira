import PostFeedItem, { PostFeedItemProps } from '@/components/PostFeedItem';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { FlatList, StyleSheet } from 'react-native';

export default function FeedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Mock feed data - replace with Supabase query later
  // This will show posts from all users (or followed users)
  const mockFeedPosts: PostFeedItemProps[] = [
    // Placeholder for future feed posts
    // Will be populated with posts from Supabase
  ];

  const renderPost = ({ item }: { item: PostFeedItemProps }) => (
    <PostFeedItem {...item} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
        No posts in your feed yet
      </Text>
    </View>
  );

  return (
    <FlatList
      data={mockFeedPosts}
      renderItem={renderPost}
      keyExtractor={(item) => item.post_id.toString()}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
        mockFeedPosts.length === 0 && styles.emptyListContainer
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  emptyListContainer: {
    flex: 1,
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
