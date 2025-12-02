import Colors from '@/constants/Colors';
import { useColorScheme } from '@/src/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export interface PostFeedItemProps {
  post_id: number;
  caption: string | null;
  uploaded_at: string;
  captured_at: string | null;
  user_id: string | null;
  username: string;
  profile_pic: string | null;
  handle: string | null;
  photo_url?: string; // Deprecated: use photo_urls instead
  photo_urls?: string[]; // Array of photo URLs
  photo_width?: number | null;
  photo_height?: number | null;
  like_count: number;
  comment_count: number;
  is_liked?: boolean;
  current_user_id?: string | null; // Current authenticated user's ID
  onDelete?: (postId: number) => void; // Callback when post is deleted
  camera_brand?: string | null;
  camera_model?: string | null;
  camera_nickname?: string | null;
  lens_brand?: string | null;
  lens_model?: string | null;
  lens_nickname?: string | null;
  lens_focal_length_min?: number | null;
  lens_focal_length_max?: number | null;
}

export default function PostFeedItem({
  post_id,
  caption,
  uploaded_at,
  username,
  profile_pic,
  handle,
  photo_url,
  photo_urls,
  photo_width,
  photo_height,
  like_count,
  comment_count,
  is_liked = false,
  user_id,
  current_user_id,
  onDelete,
  camera_brand,
  camera_model,
  camera_nickname,
  lens_brand,
  lens_model,
  lens_nickname,
  lens_focal_length_min,
  lens_focal_length_max,
}: PostFeedItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(false);
  const equipmentHeight = useRef(new Animated.Value(0)).current;

  // Support both photo_url (legacy) and photo_urls (new)
  const images = photo_urls && photo_urls.length > 0 
    ? photo_urls 
    : photo_url 
      ? [photo_url] 
      : ['https://via.placeholder.com/400x400'];

  // Calculate image aspect ratio
  const aspectRatio = photo_width && photo_height 
    ? photo_width / photo_height 
    : 1; // Default to 1:1 if dimensions not available
  const imageHeight = width / aspectRatio;

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentImageIndex(index);
  };

  const [liked, setLiked] = useState(is_liked);
  const [likes, setLikes] = useState(like_count);

  const handleLikeToggle = () => {
    const newValue = !liked;
    setLiked(newValue);
    setLikes(likes + (newValue ? 1 : -1));
  };

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
  const isOwnPost = current_user_id && user_id && current_user_id === user_id;
  const hasEquipment = (camera_brand && camera_model) || (lens_brand && lens_model);

  const toggleEquipment = () => {
    const toValue = isEquipmentExpanded ? 0 : 1;
    Animated.timing(equipmentHeight, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setIsEquipmentExpanded(!isEquipmentExpanded);
  };

  const getLensDisplay = () => {
    if (!lens_brand || !lens_model) return null;
    const focalLength = lens_focal_length_min && lens_focal_length_max
      ? lens_focal_length_min === lens_focal_length_max
        ? `${lens_focal_length_min}mm`
        : `${lens_focal_length_min}-${lens_focal_length_max}mm`
      : '';
    return `${lens_brand} ${lens_model}${focalLength ? ` (${focalLength})` : ''}`;
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(post_id);
            }
          },
        },
      ]
    );
  };

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
        {isOwnPost && (
          <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
            <FontAwesome
              name="trash-o"
              size={18}
              color={colors.tabIconDefault}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Post Images - Scrollable if multiple */}
      <View style={styles.imageContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {images.map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={[styles.image, { height: imageHeight }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        
        {/* Pagination Dots - Only show if multiple images */}
        {images.length > 1 && (
          <View style={styles.paginationContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor: index === currentImageIndex 
                      ? colors.tint 
                      : 'rgba(255, 255, 255, 0.5)',
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Interaction Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLikeToggle}>
          <FontAwesome
            name={liked ? 'heart' : 'heart-o'}
            size={24}
            color={liked ? '#ff3040' : colors.text}
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

      {/* Equipment Section */}
      {hasEquipment && (
        <View style={styles.equipmentContainer}>
          <TouchableOpacity onPress={toggleEquipment} style={styles.equipmentToggle}>
            <FontAwesome
              name={isEquipmentExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.tabIconDefault}
            />
            <Text style={[styles.equipmentToggleText, { color: colors.tabIconDefault }]}>
              {isEquipmentExpanded ? 'Hide Equipment' : 'Show Equipment'}
            </Text>
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.equipmentContent,
              {
                maxHeight: equipmentHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 200],
                }),
                opacity: equipmentHeight,
              },
            ]}
          >
            <View style={styles.equipmentDetails}>
              {camera_brand && camera_model && (
                <View style={styles.equipmentRow}>
                  <FontAwesome name="camera" size={14} color={colors.tabIconDefault} />
                  <Text style={[styles.equipmentText, { color: colors.tabIconDefault }]}>
                    {camera_brand} {camera_model}
                    {camera_nickname && ` (${camera_nickname})`}
                  </Text>
                </View>
              )}
              {lens_brand && lens_model && (
                <View style={styles.equipmentRow}>
                  <FontAwesome name="circle" size={14} color={colors.tabIconDefault} />
                  <Text style={[styles.equipmentText, { color: colors.tabIconDefault }]}>
                    {getLensDisplay()}
                    {lens_nickname && ` (${lens_nickname})`}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
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
  deleteButton: {
    padding: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  scrollView: {
    width: width,
  },
  image: {
    width: width,
    backgroundColor: '#f0f0f0',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  equipmentContainer: {
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  equipmentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  equipmentToggleText: {
    fontSize: 12,
  },
  equipmentContent: {
    overflow: 'hidden',
  },
  equipmentDetails: {
    paddingTop: 8,
    gap: 8,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipmentText: {
    fontSize: 12,
  },
});
