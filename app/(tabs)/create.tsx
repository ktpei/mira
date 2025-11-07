import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import {
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
  const [location, setLocation] = useState('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleCreatePost = () => {
    if (!caption.trim()) {
      Alert.alert('Error', 'Please enter a caption');
      return;
    }

    // TODO: Integrate with backend/database
    const postData = {
      caption: caption.trim(),
      visibility,
      location: location.trim() || null,
      capturedAt: new Date().toISOString(),
    };

    Alert.alert(
      'Post Created', 
      `Caption: ${postData.caption}\nVisibility: ${postData.visibility}\nLocation: ${postData.location || 'None'}`
    );

    // Reset form
    setCaption('');
    setLocation('');
    setVisibility('public');
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

        <Text style={[styles.label, { color: colors.text }]}>Location (Optional)</Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.secondaryBackground,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          placeholder="Add location"
          placeholderTextColor={colors.tabIconDefault}
          value={location}
          onChangeText={setLocation}
        />

        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: colors.tint }
          ]}
          onPress={handleCreatePost}
        >
          <Text style={styles.createButtonText}>Create Post</Text>
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

