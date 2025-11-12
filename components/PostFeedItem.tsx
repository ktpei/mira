import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Dimensions, Image, StyleSheet, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

export interface PostFeedItemProps {
  post_id: number;
  caption: string | null;
  uploaded_at: string;
  captured_at: string | null;
  user_id: number;
  username: string;
  profile_pic: string | null;
  handle: string | null;
  photo_url: string;
  photo_width?: number | null;
  photo_height?: number | null;
  like_count: number;
  comment_count: number;
  is_liked?: boolean;
}

export default function PostFeedItem({
  post_id,
  caption,
  uploaded_at,
  username,
  profile_pic,
  handle,
  photo_url,
  photo_width,
  photo_height,
  like_count,
  comment_count,
  is_liked = false,
}: PostFeedItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Calculate image aspect ratio
  const aspectRatio = photo_width && photo_height 
    ? photo_width / photo_height 
    : 1; // Default to 1:1 if dimensions not available
  const imageHeight = width / aspectRatio;

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const displayName = handle || username;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* User Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.userInfo}>
          <Image
            source={{ 
              uri: profile_pic || 'https://via.placeholder.com/40' 
            }}
            style={styles.profilePic}
          />
          <Text style={[styles.username, { color: colors.text }]}>
            {displayName}
          </Text>
        </View>
      </View>

      {/* Post Image */}
      <Image
        source={{ uri: photo_url }}
        style={[styles.image, { height: imageHeight }]}
        resizeMode="cover"
      />

      {/* Interaction Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <FontAwesome
            name={is_liked ? 'heart' : 'heart-o'}
            size={24}
            color={is_liked ? '#ff3040' : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <FontAwesome
            name="comment-o"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.actionButton}>
          <FontAwesome
            name="bookmark-o"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Like Count */}
      {like_count > 0 && (
        <Text style={[styles.likeCount, { color: colors.text }]}>
          {like_count} {like_count === 1 ? 'like' : 'likes'}
        </Text>
      )}

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={[styles.caption, { color: colors.text }]}>
          <Text style={[styles.captionUsername, { color: colors.text }]}>
            {displayName}{' '}
          </Text>
          {caption || ''}
        </Text>
      </View>

      {/* Comment Count */}
      {comment_count > 0 && (
        <TouchableOpacity style={styles.commentsButton}>
          <Text style={[styles.commentsText, { color: colors.tabIconDefault }]}>
            View all {comment_count} {comment_count === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
        {formatRelativeTime(uploaded_at)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  image: {
    width: width,
    backgroundColor: '#f0f0f0',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButton: {
    marginRight: 16,
  },
  spacer: {
    flex: 1,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  captionContainer: {
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
  },
  commentsButton: {
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  commentsText: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
});

