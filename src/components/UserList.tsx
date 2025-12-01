import Colors from '@/constants/Colors';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface UserListItem {
  user_id: string;
  username: string;
  full_name: string | null;
  profile_pic: string | null;
}

interface UserListProps {
  users: UserListItem[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  emptyMessage?: string;
  showActionButton?: boolean;
  actionButtonLabel?: string;
  onActionPress?: (userId: string) => void;
  actionButtonLoading?: string | null;
}

export default function UserList({ 
  users, 
  loading, 
  error, 
  onRefresh,
  emptyMessage = 'No users found',
  showActionButton = false,
  actionButtonLabel = 'Action',
  onActionPress,
  actionButtonLoading = null
}: UserListProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const renderItem = ({ item }: { item: UserListItem }) => {
    const isLoading = actionButtonLoading === item.user_id;
    
    return (
      <View style={[styles.userItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.userContent}
          onPress={() => {
            // Navigate to user profile (future implementation)
            // router.push(`/screens/user/${item.user_id}`);
            console.log('Navigate to user:', item.username);
          }}
        >
          <Image
            source={{ uri: item.profile_pic || 'https://via.placeholder.com/50' }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }]}>
              {item.username}
            </Text>
            {item.full_name && (
              <Text style={[styles.fullName, { color: colors.tabIconDefault }]}>
                {item.full_name}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        {showActionButton && onActionPress && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.secondaryBackground },
              isLoading && { opacity: 0.6 }
            ]}
            onPress={() => onActionPress(item.user_id)}
            disabled={isLoading}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              {isLoading ? '...' : actionButtonLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.user_id}
        refreshing={loading}
        onRefresh={onRefresh}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.centerContainer}>
              <Text style={{ color: colors.tabIconDefault }}>{emptyMessage}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullName: {
    fontSize: 14,
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

