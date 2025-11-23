import Colors from '@/constants/Colors';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import { type Visibility } from '@/src/server/posts';
import { executeSQLFunction } from '@/src/server/supabase';
import { uploadMultipleImagesToStorage } from '@/src/utils/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity
} from 'react-native';
export default function CreateScreen() {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [locationId, setLocationId] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

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

      // Create the post with photo URLs
      const { data, error } = await executeSQLFunction('create_post_will', {
        p_user_id: user.id,
        p_caption: caption.trim() || null,
        p_location_id: locationId ? parseInt(locationId, 10) : null,
        p_captured_at: new Date().toISOString(),
        p_visibility: visibility,
        p_photo_urls: photoUrls.length > 0 ? photoUrls : null,
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
        setLocationId('');
        setVisibility('public');
        setSelectedImages([]);
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

        <Text style={[styles.label, { color: colors.text }]}>Location ID (Optional)</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.locationInput,
            {
              backgroundColor: colors.secondaryBackground,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          placeholder="Enter location ID"
          placeholderTextColor={colors.tabIconDefault}
          value={locationId}
          onChangeText={setLocationId}
          keyboardType="numeric"
        />

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
  locationInput: {
    minHeight: 50,
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
});

