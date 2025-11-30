import Colors from '@/constants/Colors';
import { executeSQLFunction } from '@/lib/supabase';
import PostFeedItem, { PostFeedItemProps } from '@/src/components/PostFeedItem';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import { signOut } from '@/src/server/auth';
import {
  addUserCamera,
  addUserLens,
  deleteUserCamera,
  deleteUserLens,
  getAllCameras,
  getAllLenses,
  getUserCameras,
  getUserLenses,
  type Camera,
  type Lens,
  type UserCamera,
  type UserLens,
} from '@/src/server/equipment';
import { deletePost } from '@/src/server/posts';
import { getFollowerCount, getFollowingCount } from '@/src/server/users';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';


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
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Equipment modal state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showLensModal, setShowLensModal] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [cameraSearchQuery, setCameraSearchQuery] = useState('');
  const [lensSearchQuery, setLensSearchQuery] = useState('');
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  
  // User equipment state
  const [userCameras, setUserCameras] = useState<UserCamera[]>([]);
  const [userLenses, setUserLenses] = useState<UserLens[]>([]);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);

  const profileData = {
    user_id: user?.id,
    username: profile?.username || user?.email || 'Guest',
    name: profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : 'Guest User',
    bio: profile?.bio || 'Welcome to Mira! Sign in to view your profile.',
    profile_pic: profile?.profile_pic || 'https://via.placeholder.com/100',
    posts: 0,
    followers: followersCount,
    following: followingCount,
  };

  const fetchCounts = async () => {
    if (!profile?.user_id) {
      setFollowersCount(0);
      setFollowingCount(0);
      return;
    }
    const [followersData, followingData] = await Promise.all([
      getFollowerCount(profile.user_id),
      getFollowingCount(profile.user_id)
    ]);
    
    if (!followersData.error) setFollowersCount(followersData.count);
    if (!followingData.error) setFollowingCount(followingData.count);
  };

  // Fetch posts from Supabase
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      fetchCounts(); // Fetch counts when fetching posts
      
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
          p_current_user_id: profile.user_id,
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
          username: profileData.username,
          profile_pic: profileData.profile_pic,
          handle: null,
          photo_urls: post.photo_urls && post.photo_urls.length > 0 
            ? post.photo_urls 
            : ['https://via.placeholder.com/400x400'],
          photo_width: null,
          photo_height: null,
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

  // Fetch all cameras
  const fetchCameras = async () => {
    try {
      setEquipmentLoading(true);
      const { data, error } = await getAllCameras();
      if (error) {
        Alert.alert('Error', error.message || 'Failed to fetch cameras');
      } else if (data) {
        setCameras(data);
      }
    } catch (err: any) {
      console.error('Error fetching cameras:', err);
      Alert.alert('Error', err.message || 'Failed to fetch cameras');
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Fetch all lenses
  const fetchLenses = async () => {
    try {
      setEquipmentLoading(true);
      const { data, error } = await getAllLenses();
      if (error) {
        Alert.alert('Error', error.message || 'Failed to fetch lenses');
      } else if (data) {
        setLenses(data);
      }
    } catch (err: any) {
      console.error('Error fetching lenses:', err);
      Alert.alert('Error', err.message || 'Failed to fetch lenses');
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Handle camera selection
  const handleCameraSelect = async (camera: Camera) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    try {
      setEquipmentLoading(true);
      console.log('Adding camera:', camera.camera_id, camera.brand, camera.model);
      const { data, error } = await addUserCamera({
        userId: user.id,
        cameraId: camera.camera_id,
      });

      if (error) {
        console.error('Error adding camera:', error);
        Alert.alert('Error', error.message || 'Failed to add camera');
      } else {
        console.log('Camera added successfully:', data);
        Alert.alert('Success', `${camera.brand} ${camera.model} added to your profile`);
        setShowCameraModal(false);
        setCameraSearchQuery('');
        fetchUserEquipment(); // Refresh equipment list
      }
    } catch (err: any) {
      console.error('Error adding camera:', err);
      Alert.alert('Error', err.message || 'Failed to add camera');
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Handle lens selection
  const handleLensSelect = async (lens: Lens) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    try {
      setEquipmentLoading(true);
      const { data, error } = await addUserLens({
        userId: user.id,
        lensId: lens.lens_id,
      });

      if (error) {
        Alert.alert('Error', error.message || 'Failed to add lens');
      } else {
        Alert.alert('Success', `${lens.brand} ${lens.model} added to your profile`);
        setShowLensModal(false);
        setLensSearchQuery('');
        fetchUserEquipment(); // Refresh equipment list
      }
    } catch (err: any) {
      console.error('Error adding lens:', err);
      Alert.alert('Error', err.message || 'Failed to add lens');
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Fetch user equipment
  const fetchUserEquipment = async () => {
    if (!user?.id) return;
    try {
      const [camerasResult, lensesResult] = await Promise.all([
        getUserCameras(user.id),
        getUserLenses(user.id),
      ]);
      if (camerasResult.data) setUserCameras(camerasResult.data);
      if (lensesResult.data) setUserLenses(lensesResult.data);
    } catch (err: any) {
      console.error('Error fetching user equipment:', err);
    }
  };

  // Update the useEffect to wait for profile to load
  useEffect(() => {
    if (profile?.user_id) {
      fetchPosts();
    }
  }, [profile?.user_id]);

  // Handle delete camera
  const handleDeleteCamera = async (userCameraId: number) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    Alert.alert(
      'Delete Camera',
      'Are you sure you want to remove this camera from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await deleteUserCamera(user.id, userCameraId);
              if (error) {
                Alert.alert('Error', error.message || 'Failed to delete camera');
              } else if (data && data.length > 0 && data[0].success) {
                setUserCameras((prev) => prev.filter((c) => c.user_camera_id !== userCameraId));
                Alert.alert('Success', 'Camera removed from your collection');
              } else {
                Alert.alert('Error', data?.[0]?.message || 'Failed to delete camera');
              }
            } catch (err: any) {
              console.error('Error deleting camera:', err);
              Alert.alert('Error', err.message || 'An unexpected error occurred');
            }
          },
        },
      ]
    );
  };

  // Handle delete lens
  const handleDeleteLens = async (userLensId: number) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    Alert.alert(
      'Delete Lens',
      'Are you sure you want to remove this lens from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await deleteUserLens(user.id, userLensId);
              if (error) {
                Alert.alert('Error', error.message || 'Failed to delete lens');
              } else if (data && data.length > 0 && data[0].success) {
                setUserLenses((prev) => prev.filter((l) => l.user_lens_id !== userLensId));
                Alert.alert('Success', 'Lens removed from your collection');
              } else {
                Alert.alert('Error', data?.[0]?.message || 'Failed to delete lens');
              }
            } catch (err: any) {
              console.error('Error deleting lens:', err);
              Alert.alert('Error', err.message || 'An unexpected error occurred');
            }
          },
        },
      ]
    );
  };

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
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              if (profile?.user_id) {
                router.push({
                  pathname: '/screens/followers' as any,
                  params: { userId: profile.user_id }
                });
              }
            }}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {profileData.followers}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>followers</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              if (profile?.user_id) {
                router.push({
                  pathname: '/screens/following' as any,
                  params: { userId: profile.user_id }
                });
              }
            }}
          >
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

      {/* Equipment Section */}
      <View style={styles.equipmentSection}>
        <TouchableOpacity
          style={styles.equipmentHeader}
          onPress={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
        >
          <Text style={[styles.equipmentTitle, { color: colors.text }]}>
            My Equipment ({userCameras.length + userLenses.length})
          </Text>
          <FontAwesome
            name={showEquipmentDropdown ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.text}
          />
        </TouchableOpacity>

        {showEquipmentDropdown && (
          <View style={styles.equipmentContent}>
            {/* Cameras */}
            {userCameras.length > 0 && (
              <View style={styles.equipmentCategory}>
                <Text style={[styles.equipmentCategoryTitle, { color: colors.text }]}>
                  Cameras ({userCameras.length})
                </Text>
                {userCameras.map((camera) => (
                  <View
                    key={camera.user_camera_id}
                    style={[styles.equipmentItem, { borderColor: colors.border }]}
                  >
                    <View style={styles.equipmentItemContent}>
                      <Text style={[styles.equipmentItemName, { color: colors.text }]}>
                        {camera.brand} {camera.model}
                      </Text>
                      {camera.nickname && (
                        <Text style={[styles.equipmentItemDetail, { color: colors.tabIconDefault }]}>
                          {camera.nickname}
                        </Text>
                      )}
                      {camera.serial_num && (
                        <Text style={[styles.equipmentItemDetail, { color: colors.tabIconDefault }]}>
                          SN: {camera.serial_num}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCamera(camera.user_camera_id)}
                      style={styles.deleteButton}
                    >
                      <FontAwesome name="trash" size={16} color={colors.tabIconDefault} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Lenses */}
            {userLenses.length > 0 && (
              <View style={styles.equipmentCategory}>
                <Text style={[styles.equipmentCategoryTitle, { color: colors.text }]}>
                  Lenses ({userLenses.length})
                </Text>
                {userLenses.map((lens) => (
                  <View
                    key={lens.user_lens_id}
                    style={[styles.equipmentItem, { borderColor: colors.border }]}
                  >
                    <View style={styles.equipmentItemContent}>
                      <Text style={[styles.equipmentItemName, { color: colors.text }]}>
                        {lens.brand} {lens.model}
                      </Text>
                      {lens.nickname && (
                        <Text style={[styles.equipmentItemDetail, { color: colors.tabIconDefault }]}>
                          {lens.nickname}
                        </Text>
                      )}
                      {lens.serial_num && (
                        <Text style={[styles.equipmentItemDetail, { color: colors.tabIconDefault }]}>
                          SN: {lens.serial_num}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteLens(lens.user_lens_id)}
                      style={styles.deleteButton}
                    >
                      <FontAwesome name="trash" size={16} color={colors.tabIconDefault} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {userCameras.length === 0 && userLenses.length === 0 && (
              <Text style={[styles.emptyEquipmentText, { color: colors.tabIconDefault }]}>
                No equipment added yet
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Equipment Buttons */}
      <View style={styles.equipmentButtonsRow}>
        <TouchableOpacity
          style={[styles.equipmentButton, { backgroundColor: colors.tint }]}
          onPress={async () => {
            setShowCameraModal(true);
            await fetchCameras();
          }}
        >
          <FontAwesome name="camera" size={16} color="#fff" />
          <Text style={styles.equipmentButtonText}>Add Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.equipmentButton, { backgroundColor: colors.tint }]}
          onPress={async () => {
            setShowLensModal(true);
            await fetchLenses();
          }}
        >
          <FontAwesome name="circle" size={16} color="#fff" />
          <Text style={styles.equipmentButtonText}>Add Lens</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Error: {error}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No posts yet
        </Text>
      </View>
    );
  };

  // Filter cameras based on search query
  const filteredCameras = cameras.filter((camera) => {
    if (!cameraSearchQuery.trim()) return true;
    const query = cameraSearchQuery.toLowerCase();
    return (
      camera.brand.toLowerCase().includes(query) ||
      camera.model.toLowerCase().includes(query)
    );
  });

  // Filter lenses based on search query
  const filteredLenses = lenses.filter((lens) => {
    if (!lensSearchQuery.trim()) return true;
    const query = lensSearchQuery.toLowerCase();
    return (
      lens.brand.toLowerCase().includes(query) ||
      lens.model.toLowerCase().includes(query)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={posts.length === 0 ? styles.emptyListContainer : undefined}
        refreshing={loading}
        onRefresh={fetchPosts}
      />

      {/* Camera Selection Modal */}
      <Modal
        visible={showCameraModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCameraModal(false);
          setCameraSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Camera</Text>
              <TouchableOpacity onPress={() => {
                setShowCameraModal(false);
                setCameraSearchQuery('');
              }}>
                <FontAwesome name="times" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.searchInput, { 
                backgroundColor: colors.secondaryBackground, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="Search cameras..."
              placeholderTextColor={colors.tabIconDefault}
              value={cameraSearchQuery}
              onChangeText={setCameraSearchQuery}
              autoFocus={true}
            />

            {equipmentLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : (
              <FlatList
                data={filteredCameras}
                keyExtractor={(item) => item.camera_id.toString()}
                renderItem={({ item: camera }) => (
                  <TouchableOpacity
                    style={[styles.equipmentItem, { 
                      backgroundColor: colors.secondaryBackground,
                      borderColor: colors.border 
                    }]}
                    onPress={() => handleCameraSelect(camera)}
                  >
                    <View style={styles.equipmentItemContent}>
                      <Text style={[styles.equipmentItemName, { color: colors.text }]}>
                        {camera.brand} {camera.model}
                      </Text>
                      {camera.sensor_type && (
                        <Text style={[styles.equipmentItemDetail, { color: colors.tabIconDefault }]}>
                          {camera.sensor_type} • {camera.camera_type || 'Camera'}
                        </Text>
                      )}
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={colors.tabIconDefault} />
                  </TouchableOpacity>
                )}
                style={styles.modalList}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Lens Selection Modal */}
      <Modal
        visible={showLensModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowLensModal(false);
          setLensSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Lens</Text>
              <TouchableOpacity onPress={() => {
                setShowLensModal(false);
                setLensSearchQuery('');
              }}>
                <FontAwesome name="times" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.searchInput, { 
                backgroundColor: colors.secondaryBackground, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="Search lenses..."
              placeholderTextColor={colors.tabIconDefault}
              value={lensSearchQuery}
              onChangeText={setLensSearchQuery}
              autoFocus={true}
            />

            {equipmentLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : (
              <FlatList
                data={filteredLenses}
                keyExtractor={(item) => item.lens_id.toString()}
                renderItem={({ item: lens }) => (
                  <TouchableOpacity
                    style={[styles.equipmentItem, { 
                      backgroundColor: colors.secondaryBackground,
                      borderColor: colors.border 
                    }]}
                    onPress={() => handleLensSelect(lens)}
                  >
                    <View style={styles.equipmentItemContent}>
                      <Text style={[styles.equipmentItemName, { color: colors.text }]}>
                        {lens.brand} {lens.model}
                      </Text>
                      {(lens.focal_length_min || lens.focal_length_max || lens.lens_type) && (
                        <Text style={[styles.equipmentItemDetail, { color: colors.tabIconDefault }]}>
                          {lens.focal_length_min && lens.focal_length_max
                            ? `${lens.focal_length_min === lens.focal_length_max ? lens.focal_length_min : `${lens.focal_length_min}-${lens.focal_length_max}`}mm`
                            : ''}
                          {lens.focal_length_min && lens.lens_type ? ' • ' : ''}
                          {lens.lens_type || ''}
                          {lens.aperture_max && ` • f/${lens.aperture_max}`}
                        </Text>
                      )}
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={colors.tabIconDefault} />
                  </TouchableOpacity>
                )}
                style={styles.modalList}
              />
            )}
          </View>
        </View>
      </Modal>
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
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePictureContainer: {
    marginRight: 16,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bioSection: {
    marginBottom: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
  equipmentButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  equipmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  equipmentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchInput: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  modalList: {
    flex: 1,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  equipmentItemContent: {
    flex: 1,
  },
  equipmentItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  equipmentItemDetail: {
    fontSize: 14,
  },
  equipmentSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  equipmentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  equipmentContent: {
    marginTop: 8,
  },
  equipmentCategory: {
    marginBottom: 16,
  },
  equipmentCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyEquipmentText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
