import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Note: In Expo, environment variables must be prefixed with EXPO_PUBLIC_ to be accessible in client code
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Execute a PostgreSQL function (stored procedure) via Supabase RPC
 * 
 * @param functionName - Name of the PostgreSQL function to call
 * @param params - Parameters to pass to the function
 * @returns Result from the function execution
 */
export async function executeSQLFunction<T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<{ data: T | null; error: any }> {
  const { data, error } = await supabase.rpc(functionName, params || {});
  return { data, error };
}

