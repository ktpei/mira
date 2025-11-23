import { executeSQLFunction } from '@/src/server/supabase';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/src/components/Themed';
import { useAuth } from '@/src/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, TextInput, TouchableOpacity } from 'react-native';

// Mock current user ID - replace with actual user_id from database later
const CURRENT_USER_ID = 1;

type SearchTab = 'posts' | 'users' | 'tags';

const { width } = Dimensions.get('window');
const POST_GRID_SIZE = (width - 4) / 3; // 3 columns with 2px gaps

interface SearchPostResult {
  post_id: number;
  user_id: number;
  username: string;
  profile_pic: string | null;
  caption: string | null;
  captured_at: string;
  uploaded_at: string;
  photo_urls: string[];
  like_count: number;
  comment_count: number;
  is_liked_by_user: boolean;
}

interface SearchUserResult {
  user_id: number;
  username: string;
  handle: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_pic: string | null;
  bio: string | null;
  follower_count: number;
  is_following: boolean;
  relevance_score: number;
}

interface SearchTagResult {
  tag_id: number;
  tag_name: string;
  usage_count: number;
}

export default function SearchScreen() {
  const [activeTab, setActiveTab] = useState<SearchTab>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<SearchPostResult[]>([]);
  const [users, setUsers] = useState<SearchUserResult[]>([]);
  const [tags, setTags] = useState<SearchTagResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search posts by caption
  const searchPosts = async (query: string) => {
    if (!query.trim()) {
      setPosts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await executeSQLFunction<SearchPostResult[]>(
        'search_posts',
        {
          p_search_query: query.trim(),
          p_current_user_id: CURRENT_USER_ID,
          p_limit: 30,
          p_offset: 0,
        }
      );

      if (rpcError) {
        console.error('Error searching posts:', rpcError);
        setError(rpcError.message || 'Failed to search posts');
        setPosts([]);
        return;
      }

      setPosts(data || []);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await executeSQLFunction<SearchUserResult[]>(
        'search_users',
        {
          p_search_query: query.trim(),
          p_current_user_id: CURRENT_USER_ID,
          p_limit: 20,
          p_offset: 0,
        }
      );

      if (rpcError) {
        console.error('Error searching users:', rpcError);
        setError(rpcError.message || 'Failed to search users');
        setUsers([]);
        return;
      }

      setUsers(data || []);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Search tags (autocomplete)
  const searchTags = async (query: string) => {
    if (!query.trim()) {
      setTags([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await executeSQLFunction<SearchTagResult[]>(
        'search_tags',
        {
          p_search_query: query.trim(),
          p_limit: 20,
        }
      );

      if (rpcError) {
        console.error('Error searching tags:', rpcError);
        setError(rpcError.message || 'Failed to search tags');
        setTags([]);
        return;
      }

      setTags(data || []);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change with proper debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text.trim()) {
      setPosts([]);
      setUsers([]);
      setTags([]);
      return;
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (activeTab === 'posts') {
        searchPosts(text);
      } else if (activeTab === 'users') {
        searchUsers(text);
      } else if (activeTab === 'tags') {
        searchTags(text);
      }
    }, 300);
  };

  // Handle tab change
  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    if (searchQuery.trim()) {
      if (tab === 'posts') {
        searchPosts(searchQuery);
      } else if (tab === 'users') {
        searchUsers(searchQuery);
      } else if (tab === 'tags') {
        searchTags(searchQuery);
      }
    }
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Render post in grid (Instagram-style)
  const renderPostGridItem = ({ item, index }: { item: SearchPostResult; index: number }) => {
    const photoUrl = item.photo_urls && item.photo_urls.length > 0 
      ? item.photo_urls[0] 
      : 'https://via.placeholder.com/400x400';

    return (
      <TouchableOpacity 
        style={[
          styles.gridItem,
          { 
            marginRight: (index + 1) % 3 === 0 ? 0 : 2,
            marginBottom: 2,
          }
        ]}
      >
        <Image 
          source={{ uri: photoUrl }} 
          style={styles.gridImage}
          resizeMode="cover"
        />
        {item.photo_urls && item.photo_urls.length > 1 && (
          <View style={styles.multiPhotoIndicator}>
            <FontAwesome name="clone" size={12} color="#fff" />
          </View>
        )}
        <View style={styles.overlay}>
          <View style={styles.overlayStats}>
            <FontAwesome name="heart" size={14} color="#fff" />
            <Text style={styles.overlayText}>{item.like_count}</Text>
            <FontAwesome name="comment" size={14} color="#fff" style={{ marginLeft: 12 }} />
            <Text style={styles.overlayText}>{item.comment_count}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const hasResults = (activeTab === 'posts' && posts.length > 0) ||
                     (activeTab === 'users' && users.length > 0) ||
                     (activeTab === 'tags' && tags.length > 0);

  return (
    <View style={styles.container}>
      {/* Search Bar - Instagram Style */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={14} color="#8e8e8e" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#8e8e8e"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setPosts([]);
                setUsers([]);
                setTags([]);
              }}
              style={styles.clearButton}
            >
              <FontAwesome name="times-circle" size={16} color="#8e8e8e" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs - Only show when searching */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => handleTabChange('posts')}
          >
            <View style={[styles.tabIndicator, activeTab === 'posts' && styles.activeTabIndicator]} />
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => handleTabChange('users')}
          >
            <View style={[styles.tabIndicator, activeTab === 'users' && styles.activeTabIndicator]} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Accounts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tags' && styles.activeTab]}
            onPress={() => handleTabChange('tags')}
          >
            <View style={[styles.tabIndicator, activeTab === 'tags' && styles.activeTabIndicator]} />
            <Text style={[styles.tabText, activeTab === 'tags' && styles.activeTabText]}>
              Tags
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Empty State - Before Search */}
      {!searchQuery.trim() && !loading && !error && (
        <View style={styles.emptyStateContainer}>
          <FontAwesome name="search" size={48} color="#c7c7c7" />
          <Text style={styles.emptyStateText}>Search for posts, accounts, and tags</Text>
        </View>
      )}

      {/* Results */}
      {!loading && !error && searchQuery.trim().length > 0 && (
        <View style={styles.resultsContainer}>
          {/* Posts - Grid View */}
          {activeTab === 'posts' && (
            <FlatList
              data={posts}
              numColumns={3}
              keyExtractor={(item) => item.post_id.toString()}
              renderItem={renderPostGridItem}
              contentContainerStyle={styles.gridContainer}
              ListEmptyComponent={
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyResultsText}>No posts found</Text>
                </View>
              }
            />
          )}

          {/* Users - Instagram-style cards */}
          {activeTab === 'users' && (
            <FlatList
              data={users}
              keyExtractor={(item) => item.user_id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.userCard}>
                  <Image
                    source={{ uri: item.profile_pic || 'https://via.placeholder.com/60' }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userUsername}>{item.username}</Text>
                    {item.first_name && (
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.first_name} {item.last_name || ''}
                      </Text>
                    )}
                    {item.bio && (
                      <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={[styles.followButton, item.is_following && styles.followingButton]}
                  >
                    <Text style={[styles.followButtonText, item.is_following && styles.followingButtonText]}>
                      {item.is_following ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyResultsText}>No accounts found</Text>
                </View>
              }
            />
          )}

          {/* Tags */}
          {activeTab === 'tags' && (
            <FlatList
              data={tags}
              keyExtractor={(item) => item.tag_id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.tagCard}>
                  <View style={styles.tagIconContainer}>
                    <FontAwesome name="hashtag" size={24} color="#262626" />
                  </View>
                  <View style={styles.tagInfo}>
                    <Text style={styles.tagName}>{item.tag_name}</Text>
                    <Text style={styles.tagCount}>{item.usage_count.toLocaleString()} posts</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyResultsText}>No tags found</Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbdbdb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efefef',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    color: '#262626',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbdbdb',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {
    // No additional styles needed - visual indicator handled by activeTabIndicator
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'transparent',
  },
  activeTabIndicator: {
    backgroundColor: '#262626',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e8e',
    textTransform: 'uppercase',
  },
  activeTabText: {
    color: '#262626',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ed4956',
    fontSize: 14,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e8e',
  },
  resultsContainer: {
    flex: 1,
  },
  gridContainer: {
    padding: 0,
  },
  gridItem: {
    width: POST_GRID_SIZE,
    height: POST_GRID_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#efefef',
  },
  multiPhotoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  overlayStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbdbdb',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#efefef',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    color: '#8e8e8e',
    marginBottom: 2,
  },
  userBio: {
    fontSize: 14,
    color: '#8e8e8e',
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0095f6',
  },
  followingButton: {
    backgroundColor: '#efefef',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  followingButtonText: {
    color: '#262626',
  },
  tagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbdbdb',
  },
  tagIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#efefef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  tagCount: {
    fontSize: 14,
    color: '#8e8e8e',
  },
  emptyResults: {
    padding: 40,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 16,
    color: '#8e8e8e',
  },
});

