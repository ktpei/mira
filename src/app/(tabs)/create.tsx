import Colors from '@/constants/Colors';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUserCameras, getUserLenses, type UserCamera, type UserLens } from '@/src/server/equipment';
import { createOrFindLocation } from '@/src/server/locations';
import { type Visibility } from '@/src/server/posts';
import { executeSQLFunction } from '@/src/server/supabase';
import { uploadMultipleImagesToStorage } from '@/src/utils/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity
} from 'react-native';
interface LocationState {
  latitude: number | null;
  longitude: number | null;
  name: string | null;
  address: string | null;
}

export default function CreateScreen() {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    name: null,
    address: null,
  });
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userCameras, setUserCameras] = useState<UserCamera[]>([]);
  const [userLenses, setUserLenses] = useState<UserLens[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [selectedLensId, setSelectedLensId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  // Fetch user equipment
  const fetchEquipment = async () => {
    if (!user?.id) return;
    try {
      const [camerasResult, lensesResult] = await Promise.all([
        getUserCameras(user.id),
        getUserLenses(user.id),
      ]);
      if (camerasResult.error) {
        console.error('Error fetching cameras:', camerasResult.error);
      } else if (camerasResult.data) {
        console.log('Fetched cameras:', camerasResult.data.length);
        setUserCameras(camerasResult.data);
      }
      if (lensesResult.error) {
        console.error('Error fetching lenses:', lensesResult.error);
      } else if (lensesResult.data) {
        console.log('Fetched lenses:', lensesResult.data.length);
        setUserLenses(lensesResult.data);
      }
    } catch (err: any) {
      console.error('Error fetching equipment:', err);
    }
  };

  // Fetch user equipment on mount
  useEffect(() => {
    fetchEquipment();
  }, [user?.id]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEquipment();
    setRefreshing(false);
  };

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload images!'
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => asset.uri);
      setSelectedImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to add your current location to the post.'
        );
        setIsGettingLocation(false);
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Try to get reverse geocoding for address
      let address = null;
      let name = null;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          name = place.name || place.street || null;
          address = [
            place.street,
            place.city,
            place.region,
            place.country,
          ]
            .filter(Boolean)
            .join(', ') || null;
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding failed:', geocodeError);
        // Continue without address
      }

      setLocation({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        name,
        address,
      });
      setUseCurrentLocation(true);
    } catch (error: any) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const clearLocation = () => {
    setLocation({
      latitude: null,
      longitude: null,
      name: null,
      address: null,
    });
    setUseCurrentLocation(false);
  };

  const handleCreatePost = async () => {
    if (!caption.trim() && selectedImages.length === 0) {
      Alert.alert('Error', 'Please enter a caption or select an image');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    setIsLoading(true);
    setIsUploadingImages(true);

    try {
      // Upload images to Supabase Storage first
      let photoUrls: string[] = [];
      if (selectedImages.length > 0) {
        try {
          photoUrls = await uploadMultipleImagesToStorage(
            selectedImages,
            'posts',
            user.id
          );
        } catch (uploadError: any) {
          console.error('Error uploading images:', uploadError);
          Alert.alert(
            'Upload Error',
            uploadError.message || 'Failed to upload images. Please try again.'
          );
          setIsLoading(false);
          setIsUploadingImages(false);
          return;
        }
      }

      setIsUploadingImages(false);

      // Create or find location if provided
      let locationId: number | null = null;
      if (location.latitude !== null && location.longitude !== null) {
        const { data: locationData, error: locationError } = await createOrFindLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          address: location.address,
        });

        if (locationError) {
          console.error('Error creating/finding location:', locationError);
          Alert.alert(
            'Location Error',
            'Failed to save location. Post will be created without location.'
          );
          // Continue without location
        } else if (locationData) {
          locationId = locationData.location_id;
        }
      }

      // Create the post with photo URLs and equipment
      const { data, error } = await executeSQLFunction('create_post_will', {
        p_user_id: user.id,
        p_caption: caption.trim() || null,
        p_location_id: locationId,
        p_captured_at: new Date().toISOString(),
        p_visibility: visibility,
        p_photo_urls: photoUrls.length > 0 ? photoUrls : null,
        p_user_camera_id: selectedCameraId,
        p_user_lens_id: selectedLensId,
      });

      if (error) {
        console.error('Error creating post:', error);
        Alert.alert(
          'Error',
          error.message || 'Failed to create post. Please try again.'
        );
        return;
      }

      if (data && data.length > 0) {
        Alert.alert('Success', 'Post created successfully!');
        // Reset form
        setCaption('');
        setLocation({
          latitude: null,
          longitude: null,
          name: null,
          address: null,
        });
        setUseCurrentLocation(false);
        setVisibility('public');
        setSelectedImages([]);
        setSelectedCameraId(null);
        setSelectedLensId(null);
      } else {
        Alert.alert('Error', 'Post creation failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setIsUploadingImages(false);
    }
  };

  const visibilityOptions: { value: Visibility; label: string; icon: string }[] = [
    { value: 'public', label: 'Public', icon: 'globe' },
    { value: 'private', label: 'Private', icon: 'lock' },
    { value: 'friends', label: 'Friends', icon: 'users' },
  ];

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Caption</Text>
        <TextInput
          style={[
            styles.textInput, 
            { 
              backgroundColor: colors.secondaryBackground,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.tabIconDefault}
          multiline
          numberOfLines={4}
          value={caption}
          onChangeText={setCaption}
        />

        <Text style={[styles.label, { color: colors.text }]}>Photos</Text>
        <TouchableOpacity
          style={[
            styles.imagePickerButton,
            {
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.border
            }
          ]}
          onPress={pickImage}
          disabled={isLoading}
        >
          <FontAwesome name="camera" size={20} color={colors.text} />
          <Text style={[styles.imagePickerText, { color: colors.text }]}>
            {selectedImages.length > 0
              ? `Add More Photos (${selectedImages.length} selected)`
              : 'Select Photos'}
          </Text>
        </TouchableOpacity>

        {selectedImages.length > 0 && (
          <View style={styles.imagePreviewContainer}>
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.imagePreviewWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                  disabled={isLoading}
                >
                  <FontAwesome name="times-circle" size={24} color="#ff3040" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Visibility</Text>
        <View style={styles.visibilityContainer}>
          {visibilityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.visibilityButton,
                {
                  backgroundColor: visibility === option.value 
                    ? colors.tint 
                    : colors.secondaryBackground,
                  borderColor: colors.border
                }
              ]}
              onPress={() => setVisibility(option.value)}
            >
              <FontAwesome
                name={option.icon as any}
                size={20}
                color={visibility === option.value ? '#fff' : colors.text}
              />
              <Text
                style={[
                  styles.visibilityText,
                  {
                    color: visibility === option.value ? '#fff' : colors.text
                  }
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Equipment (Optional)</Text>
        <View style={styles.equipmentContainer}>
          <View style={styles.equipmentPicker}>
            <Text style={[styles.equipmentLabel, { color: colors.tabIconDefault }]}>Camera</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.equipmentScrollView}
            >
              <TouchableOpacity
                style={[
                  styles.equipmentOption,
                  selectedCameraId === null && styles.equipmentOptionSelected,
                  { 
                    backgroundColor: selectedCameraId === null ? colors.tint : colors.secondaryBackground,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedCameraId(null)}
              >
                <Text style={[
                  styles.equipmentOptionText,
                  { color: selectedCameraId === null ? '#fff' : colors.text }
                ]}>
                  None
                </Text>
              </TouchableOpacity>
              {userCameras.map((camera) => (
                <TouchableOpacity
                  key={camera.user_camera_id}
                  style={[
                    styles.equipmentOption,
                    selectedCameraId === camera.user_camera_id && styles.equipmentOptionSelected,
                    { 
                      backgroundColor: selectedCameraId === camera.user_camera_id ? colors.tint : colors.secondaryBackground,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setSelectedCameraId(camera.user_camera_id)}
                >
                  <Text style={[
                    styles.equipmentOptionText,
                    { color: selectedCameraId === camera.user_camera_id ? '#fff' : colors.text }
                  ]} numberOfLines={1}>
                    {camera.nickname || `${camera.brand} ${camera.model}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.equipmentPicker}>
            <Text style={[styles.equipmentLabel, { color: colors.tabIconDefault }]}>Lens</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.equipmentScrollView}
            >
              <TouchableOpacity
                style={[
                  styles.equipmentOption,
                  selectedLensId === null && styles.equipmentOptionSelected,
                  { 
                    backgroundColor: selectedLensId === null ? colors.tint : colors.secondaryBackground,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedLensId(null)}
              >
                <Text style={[
                  styles.equipmentOptionText,
                  { color: selectedLensId === null ? '#fff' : colors.text }
                ]}>
                  None
                </Text>
              </TouchableOpacity>
              {userLenses.map((lens) => (
                <TouchableOpacity
                  key={lens.user_lens_id}
                  style={[
                    styles.equipmentOption,
                    selectedLensId === lens.user_lens_id && styles.equipmentOptionSelected,
                    { 
                      backgroundColor: selectedLensId === lens.user_lens_id ? colors.tint : colors.secondaryBackground,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setSelectedLensId(lens.user_lens_id)}
                >
                  <Text style={[
                    styles.equipmentOptionText,
                    { color: selectedLensId === lens.user_lens_id ? '#fff' : colors.text }
                  ]} numberOfLines={1}>
                    {lens.nickname || `${lens.brand} ${lens.model}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Location (Optional)</Text>
        {!useCurrentLocation ? (
          <TouchableOpacity
            style={[
              styles.locationButton,
              {
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border
              }
            ]}
            onPress={getCurrentLocation}
            disabled={isLoading || isGettingLocation}
          >
            {isGettingLocation ? (
              <>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={[styles.locationButtonText, { color: colors.text }]}>
                  Getting location...
                </Text>
              </>
            ) : (
              <>
                <FontAwesome name="map-marker" size={20} color={colors.text} />
                <Text style={[styles.locationButtonText, { color: colors.text }]}>
                  Use Current Location
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.locationInfoContainer, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <View style={styles.locationInfo}>
              <FontAwesome name="map-marker" size={16} color={colors.tint} />
              <View style={styles.locationTextContainer}>
                {location.name && (
                  <Text style={[styles.locationName, { color: colors.text }]}>
                    {location.name}
                  </Text>
                )}
                {location.address && (
                  <Text style={[styles.locationAddress, { color: colors.tabIconDefault }]} numberOfLines={2}>
                    {location.address}
                  </Text>
                )}
                {!location.name && !location.address && (
                  <Text style={[styles.locationAddress, { color: colors.tabIconDefault }]}>
                    {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeLocationButton}
              onPress={clearLocation}
              disabled={isLoading}
            >
              <FontAwesome name="times-circle" size={20} color="#ff3040" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.createButton,
            { 
              backgroundColor: isLoading ? colors.tabIconDefault : colors.tint,
              opacity: isLoading ? 0.6 : 1
            }
          ]}
          onPress={handleCreatePost}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>
                {isUploadingImages ? 'Uploading images...' : 'Creating post...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.createButtonText}>Create Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 12,
  },
  removeLocationButton: {
    padding: 4,
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  visibilityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  visibilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },
  equipmentContainer: {
    marginBottom: 16,
  },
  equipmentPicker: {
    marginBottom: 12,
  },
  equipmentLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  equipmentScrollView: {
    flexDirection: 'row',
  },
  equipmentOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  equipmentOptionSelected: {
    // Additional styles handled inline
  },
  equipmentOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

