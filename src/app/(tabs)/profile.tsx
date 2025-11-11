import Colors from '@/constants/Colors';
import { Text, View } from '@/src/components/Themed';
import { useColorScheme } from '@/src/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');
const POST_SIZE = (width - 4) / 3; // 3 columns with 2px gaps

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  // Mock data - replace with real data later
  const profileData = {
    username: 'username',
    name: 'Full Name',
    bio: 'This is a bio description\n📍 Location\n🔗 link.com',
    posts: 42,
    followers: 1234,
    following: 567,
    postsGrid: Array.from({ length: 9 }, (_, i) => i), // Mock posts
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>
        {/* Profile Picture and Stats Row */}
        <View style={styles.topSection}>
          {/* Profile Picture */}
          <View style={styles.profilePictureContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/100' }}
              style={[styles.profilePicture, { borderColor: colors.border }]}
            />
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {profileData.posts}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>posts</Text>
            </View>
            <TouchableOpacity style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {profileData.followers}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
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
          <TouchableOpacity 
            style={[styles.editButton, { 
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.border
            }]}
          >
            <Text style={[styles.editButtonText, { color: colors.text }]}>
              Edit profile
            </Text>
          </TouchableOpacity>
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
      </View>

      {/* Tab Bar (Posts, Reels, Tagged) */}
      <View style={[styles.tabBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.tabItem}>
          <FontAwesome 
            name="th" 
            size={24} 
            color={colors.text} 
          />
          <View style={[styles.tabIndicator, { backgroundColor: colors.text }]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <FontAwesome 
            name="film" 
            size={24} 
            color={colors.tabIconDefault} 
          />
        </TouchableOpacity>
      </View>

      {/* Posts Grid */}
      <View style={styles.postsGrid}>
        {profileData.postsGrid.map((_, index) => (
          <TouchableOpacity key={index} style={styles.postItem}>
            <View style={[styles.postPlaceholder, { backgroundColor: colors.secondaryBackground }]}>
              <FontAwesome 
                name="image" 
                size={30} 
                color={colors.tabIconDefault} 
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePictureContainer: {
    marginRight: 20,
  },
  profilePicture: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  editButton: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bioSection: {
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  postItem: {
    width: POST_SIZE,
    height: POST_SIZE,
    margin: 1,
  },
  postPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
