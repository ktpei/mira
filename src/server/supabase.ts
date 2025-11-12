import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Replace these with your actual Supabase URL and anon key
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

/**
 * Execute raw SQL query (requires service role - server-side only!)
 * 
 * WARNING: This should NEVER be used from the client side.
 * Only use this in Edge Functions or backend services with service role key.
 * 
 * @param query - Raw SQL query string
 * @param params - Query parameters (for parameterized queries)
 * @returns Query result
 */
export async function executeRawSQL<T = any>(
  query: string,
  params?: any[]
): Promise<{ data: T | null; error: any }> {
  // This requires service role key and should only be used server-side
  // For client-side, use PostgreSQL functions instead
  throw new Error(
    'executeRawSQL should only be used server-side with service role key. ' +
    'Use executeSQLFunction() for client-side operations.'
  );
}

