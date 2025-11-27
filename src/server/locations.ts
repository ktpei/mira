import { executeSQLFunction } from './supabase';

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface LocationResult {
  location_id: number;
  latitude: number;
  longitude: number;
  name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
}

/**
 * Create or find a location in the database
 * If a location with the same coordinates exists (within a small tolerance), returns that location
 * Otherwise, creates a new location entry
 * 
 * @param locationData - Location data including coordinates and optional metadata
 * @returns The location ID and data
 */
export async function createOrFindLocation(
  locationData: LocationData
): Promise<{ data: LocationResult | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<LocationResult[]>(
      'create_or_find_location',
      {
        p_latitude: locationData.latitude,
        p_longitude: locationData.longitude,
        p_name: locationData.name || null,
        p_address: locationData.address || null,
        p_city: locationData.city || null,
        p_country: locationData.country || null,
      }
    );

    if (error) {
      console.error('Error creating/finding location:', error);
      return { data: null, error };
    }

    return { data: data?.[0] ?? null, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to create or find location' },
    };
  }
}

