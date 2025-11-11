import Colors from '@/constants/Colors';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { executeSQLFunction } from '@/src/server/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity
} from 'react-native';

type Visibility = 'public' | 'private' | 'friends';
export default function CreateScreen() {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [locationId, setLocationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[gitcolorScheme ?? 'light'];

  const handleCreatePost = async () => {
    if (!caption.trim()) {
      Alert.alert('Error', 'Please enter a caption');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await executeSQLFunction('create_post', {
        p_user_id: 1,
        p_caption: caption.trim() || null,
        p_location_id: locationId ? parseInt(locationId, 10) : null,
        p_captured_at: new Date().toISOString(),
        p_visibility: visibility,
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
      } else {
        Alert.alert('Error', 'Post creation failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
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
            <ActivityIndicator color="#fff" />
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
});

