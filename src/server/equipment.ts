import { executeSQLFunction } from './supabase';

export interface Camera {
  camera_id: number;
  brand: string;
  model: string;
  sensor_type: string | null;
  release_year: number | null;
  camera_type: string | null;
}

export interface Lens {
  lens_id: number;
  brand: string;
  model: string;
  focal_length_min: number | null;
  focal_length_max: number | null;
  aperture_max: number | null;
  aperture_min: number | null;
  lens_type: string | null;
}

export interface UserCamera {
  user_camera_id: number;
  camera_id: number;
  brand: string;
  model: string;
  serial_num: string | null;
  nickname: string | null;
  purchase_date: string | null;
  is_active: boolean;
  sensor_type: string | null;
  release_year: number | null;
  camera_type: string | null;
}

export interface UserLens {
  user_lens_id: number;
  lens_id: number;
  brand: string;
  model: string;
  serial_num: string | null;
  nickname: string | null;
  purchase_date: string | null;
  is_active: boolean;
  focal_length_min: number | null;
  focal_length_max: number | null;
  aperture_max: number | null;
  aperture_min: number | null;
  lens_type: string | null;
}

export interface AddUserCameraParams {
  userId: string;
  cameraId: number;
  serialNum?: string | null;
  nickname?: string | null;
  purchaseDate?: string | null;
}

export interface AddUserLensParams {
  userId: string;
  lensId: number;
  serialNum?: string | null;
  nickname?: string | null;
  purchaseDate?: string | null;
}

/**
 * Get all available cameras
 */
export async function getAllCameras(): Promise<{ data: Camera[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<Camera[]>('get_all_cameras', {});
    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to fetch cameras' },
    };
  }
}

/**
 * Get all available lenses
 */
export async function getAllLenses(): Promise<{ data: Lens[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<Lens[]>('get_all_lenses', {});
    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to fetch lenses' },
    };
  }
}

/**
 * Get user's camera collection
 */
export async function getUserCameras(
  userId: string
): Promise<{ data: UserCamera[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<UserCamera[]>('get_user_cameras', {
      p_user_id: userId,
    });
    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to fetch user cameras' },
    };
  }
}

/**
 * Get user's lens collection
 */
export async function getUserLenses(
  userId: string
): Promise<{ data: UserLens[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<UserLens[]>('get_user_lenses', {
      p_user_id: userId,
    });
    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to fetch user lenses' },
    };
  }
}

/**
 * Add camera to user's collection
 */
export async function addUserCamera(
  params: AddUserCameraParams
): Promise<{ data: UserCamera[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<UserCamera[]>('add_user_camera', {
      p_user_id: params.userId,
      p_camera_id: params.cameraId,
      p_serial_num: params.serialNum || null,
      p_nickname: params.nickname || null,
      p_purchase_date: params.purchaseDate || null,
    });
    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to add camera' },
    };
  }
}

/**
 * Add lens to user's collection
 */
export async function addUserLens(
  params: AddUserLensParams
): Promise<{ data: UserLens[] | null; error: any }> {
  try {
    const { data, error } = await executeSQLFunction<UserLens[]>('add_user_lens', {
      p_user_id: params.userId,
      p_lens_id: params.lensId,
      p_serial_num: params.serialNum || null,
      p_nickname: params.nickname || null,
      p_purchase_date: params.purchaseDate || null,
    });
    return { data, error };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to add lens' },
    };
  }
}

