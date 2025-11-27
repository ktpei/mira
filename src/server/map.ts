import { executeSQLFunction } from './supabase';

export interface MapBounds {
  northEast: { latitude: number; longitude: number };
  southWest: { latitude: number; longitude: number };
}

export interface PostWithLocation {
  post_id: number;
  caption: string | null;
  uploaded_at: string;
  captured_at: string | null;
  photo_urls: string[];
  like_count: number;
  comment_count: number;
  latitude: number;
  longitude: number;
  location_id: number;
  user_id: string | null;
  username: string | null;
  profile_pic: string | null;
}

export interface LocalPost extends PostWithLocation {
  distance_km: number;
}

/**
 * Get public posts with location data within map bounds
 * 
 * @param bounds - Map bounds (northEast and southWest coordinates)
 * @param limit - Maximum number of posts to return
 * @param offset - Offset for pagination
 * @returns Posts with location data
 */
export async function getPublicPostsWithLocations(
  bounds: MapBounds,
  limit: number = 100,
  offset: number = 0
): Promise<{ data: PostWithLocation[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<PostWithLocation[]>(
      'get_public_posts_with_locations',
      {
        p_north_lat: bounds.northEast.latitude,
        p_south_lat: bounds.southWest.latitude,
        p_east_lng: bounds.northEast.longitude,
        p_west_lng: bounds.southWest.longitude,
        p_limit: limit,
        p_offset: offset,
      }
    );

    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to fetch posts with locations' },
    };
  }
}

/**
 * Get local posts within a radius of a specific location
 * 
 * @param latitude - Center latitude
 * @param longitude - Center longitude
 * @param radiusKm - Radius in kilometers (default: 10km)
 * @param limit - Maximum number of posts to return
 * @param offset - Offset for pagination
 * @returns Local posts with distance information
 */
export async function getLocalPosts(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: LocalPost[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<LocalPost[]>(
      'get_local_posts',
      {
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius_km: radiusKm,
        p_limit: limit,
        p_offset: offset,
      }
    );

    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to fetch local posts' },
    };
  }
}

