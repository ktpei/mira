import { executeSQLFunction } from '@/src/server/supabase';
import { StyleSheet } from 'react-native';

import Colors from '@/constants/Colors';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, TextInput, TouchableOpacity } from 'react-native';

interface SearchUserResult {
  user_id: string; // UUID
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_pic: string | null;
  bio: string | null;
  follower_count: number;
  is_following: boolean;
}

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SearchUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to search users');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await executeSQLFunction<SearchUserResult[]>(
        'search_users',
        {
          p_search_query: query.trim(),
          p_current_user_id: user.id,
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

  // Handle search input change with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text.trim()) {
      setUsers([]);
      setError(null);
      return;
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      searchUsers(text);
    }, 300);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchBarContainer, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.secondaryBackground || '#efefef' }]}>
          <FontAwesome 
            name="search" 
            size={14} 
            color={colors.tabIconDefault} 
            style={styles.searchIcon} 
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setUsers([]);
                setError(null);
              }}
              style={styles.clearButton}
            >
              <FontAwesome name="times-circle" size={16} color={colors.tabIconDefault} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#ed4956' }]}>{error}</Text>
        </View>
      )}

      {/* Empty State - Before Search */}
      {!searchQuery.trim() && !loading && !error && (
        <View style={styles.emptyStateContainer}>
          <FontAwesome name="search" size={48} color={colors.tabIconDefault} />
          <Text style={[styles.emptyStateText, { color: colors.tabIconDefault }]}>
            Search for users by username or name
          </Text>
        </View>
      )}

      {/* Results */}
      {!loading && !error && searchQuery.trim().length > 0 && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.userCard, { borderBottomColor: colors.border }]}
            >
              <Image
                source={{ uri: item.profile_pic || 'https://via.placeholder.com/60' }}
                style={styles.userAvatar}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.userUsername, { color: colors.text }]}>
                  {item.username}
                </Text>
                {(item.first_name || item.last_name) && (
                  <Text style={[styles.userName, { color: colors.tabIconDefault }]} numberOfLines={1}>
                    {item.first_name || ''} {item.last_name || ''}
                  </Text>
                )}
                {item.bio && (
                  <Text style={[styles.userBio, { color: colors.tabIconDefault }]} numberOfLines={1}>
                    {item.bio}
                  </Text>
                )}
                {item.follower_count > 0 && (
                  <Text style={[styles.followerCount, { color: colors.tabIconDefault }]}>
                    {item.follower_count} {item.follower_count === 1 ? 'follower' : 'followers'}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                style={[
                  styles.followButton, 
                  item.is_following && styles.followingButton,
                  { backgroundColor: item.is_following ? colors.secondaryBackground : colors.tint }
                ]}
              >
                <Text style={[
                  styles.followButtonText, 
                  { color: item.is_following ? colors.text : '#fff' }
                ]}>
                  {item.is_following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyResults}>
              <Text style={[styles.emptyResultsText, { color: colors.tabIconDefault }]}>
                No users found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
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
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    marginBottom: 2,
  },
  userBio: {
    fontSize: 14,
    marginBottom: 4,
  },
  followerCount: {
    fontSize: 12,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
  },
  followingButton: {
    // Styles handled inline
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyResults: {
    padding: 40,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 16,
  },
});
