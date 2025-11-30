import Colors from '@/constants/Colors';
import LocalPostsFeed from '@/src/components/LocalPostsFeed';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useAuth } from '@/src/contexts/AuthContext';
import { getPublicPostsWithLocations, type PostWithLocation } from '@/src/server/map';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

interface MapMarker extends PostWithLocation {
  id: string;
}

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 50,
    longitudeDelta: 50,
  });
  
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLocalFeed, setShowLocalFeed] = useState(false);
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<string>('');
  const cacheRef = useRef<Map<string, { markers: MapMarker[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Request location permissions and set initial region
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const newRegion: Region = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 10,
            longitudeDelta: 10,
          };
          setRegion(newRegion);
          if (mapRef.current) {
            mapRef.current.animateToRegion(newRegion, 1000);
          }
        }
      } catch (err) {
        console.error('Error getting location:', err);
      }
    };

    requestLocationPermission();
  }, []);

  // Fetch posts when region changes (with debouncing)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPostsForRegion();
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [region]);

  const fetchPostsForRegion = async () => {
    try {
      setLoading(true);
      setError(null);

      const bounds = {
        northEast: {
          latitude: region.latitude + region.latitudeDelta / 2,
          longitude: region.longitude + region.longitudeDelta / 2,
        },
        southWest: {
          latitude: region.latitude - region.latitudeDelta / 2,
          longitude: region.longitude - region.longitudeDelta / 2,
        },
      };

      // Create a bounds key for caching (rounded to reduce cache misses for similar views)
      const boundsKey = `${bounds.northEast.latitude.toFixed(2)},${bounds.northEast.longitude.toFixed(2)},${bounds.southWest.latitude.toFixed(2)},${bounds.southWest.longitude.toFixed(2)}`;
      
      // Check cache first
      const cached = cacheRef.current.get(boundsKey);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setMarkers(cached.markers);
        setLoading(false);
        return;
      }

      // Avoid duplicate requests for same bounds
      if (boundsKey === lastBoundsRef.current) {
        setLoading(false);
        return;
      }
      lastBoundsRef.current = boundsKey;

      const { data, error: fetchError } = await getPublicPostsWithLocations(bounds, 200, 0);

      if (fetchError) {
        console.error('Error fetching posts:', fetchError);
        setError(fetchError.message || 'Failed to load posts');
        setMarkers([]);
        return;
      }

      if (data) {
        // Convert posts to markers with unique IDs
        const newMarkers: MapMarker[] = data.map((post) => ({
          ...post,
          id: `post-${post.post_id}`,
        }));

        // Cache the results
        cacheRef.current.set(boundsKey, {
          markers: newMarkers,
          timestamp: now,
        });

        // Clean up old cache entries (keep only last 10)
        if (cacheRef.current.size > 10) {
          const entries = Array.from(cacheRef.current.entries());
          entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
          cacheRef.current.clear();
          entries.slice(0, 10).forEach(([key, value]) => {
            cacheRef.current.set(key, value);
          });
        }

        setMarkers(newMarkers);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
      setMarkers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setShowLocalFeed(true);
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };

  const getMarkerColor = (postCount: number): string => {
    // Calculate density-based color (heat map effect)
    // More posts in an area = hotter color
    if (postCount >= 10) return '#ff0000'; // Red - high density
    if (postCount >= 5) return '#ff8800'; // Orange - medium-high
    if (postCount >= 2) return '#ffaa00'; // Yellow - medium
    return '#00aaff'; // Blue - low density
  };

  // Group markers by location (for clustering effect)
  const groupedMarkers = markers.reduce((acc, marker) => {
    const key = `${marker.latitude.toFixed(4)},${marker.longitude.toFixed(4)}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(marker);
    return acc;
  }, {} as Record<string, MapMarker[]>);

  const clusteredMarkers = Object.entries(groupedMarkers).map(([key, posts]) => {
    const [lat, lng] = key.split(',').map(Number);
    const postCount = posts.length;
    const mainPost = posts[0]; // Use first post as representative

    return {
      id: `cluster-${key}`,
      latitude: lat,
      longitude: lng,
      postCount,
      posts,
      color: getMarkerColor(postCount),
      mainPost,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={true}
        mapType="standard"
      >
        {clusteredMarkers.map((cluster) => (
          <Marker
            key={cluster.id}
            coordinate={{
              latitude: cluster.latitude,
              longitude: cluster.longitude,
            }}
            onPress={() => {
              setSelectedLocation({
                latitude: cluster.latitude,
                longitude: cluster.longitude,
              });
              setShowLocalFeed(true);
            }}
          >
            <View
              style={[
                styles.markerContainer,
                {
                  backgroundColor: cluster.color,
                  borderColor: colors.border,
                },
              ]}
            >
              {cluster.postCount > 1 ? (
                <Text style={styles.markerText}>{cluster.postCount}</Text>
              ) : (
                <View style={styles.singleMarker} />
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading posts...
          </Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.errorOverlay}>
          <Text style={[styles.errorText, { color: '#ff3040' }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchPostsForRegion}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showLocalFeed}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocalFeed(false)}
      >
        <LocalPostsFeed
          latitude={selectedLocation?.latitude || 0}
          longitude={selectedLocation?.longitude || 0}
          onClose={() => {
            setShowLocalFeed(false);
            setSelectedLocation(null);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  markerContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  singleMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorOverlay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
