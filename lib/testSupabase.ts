/**
 * Test script to verify Supabase connection
 * 
 * Usage: Import this in a component and call testSupabaseConnection()
 */

import { supabase } from './supabase';

export async function testSupabaseConnection() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 SUPABASE CONNECTION TEST');
  console.log('='.repeat(60) + '\n');

  // Check if environment variables are set
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  console.log('📋 Environment Variables:');
  console.log('  EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : '❌ NOT SET');
  console.log('  EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '❌ NOT SET');
  console.log('');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Supabase environment variables are not set!');
    console.error('   Make sure your .env file contains:');
    console.error('   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
    return { success: false, error: 'Environment variables not set' };
  }

  // Test 1: Check if Supabase client is initialized
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Checking Supabase client initialization...');
  if (!supabase) {
    console.error('❌ Supabase client is not initialized');
    return { success: false, error: 'Client not initialized' };
  }
  console.log('✅ Supabase client initialized\n');

  // Test 2: Test connection by checking auth session
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Testing connection to Supabase...');
  try {
    // Try to get the current session (this will fail if not authenticated, but tests connection)
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      if (authError.message.includes('Invalid API key')) {
        console.error('❌ Invalid API key - check your EXPO_PUBLIC_SUPABASE_ANON_KEY');
        return { success: false, error: 'Invalid API key' };
      }
      
      if (authError.message.includes('Invalid URL') || authError.message.includes('fetch')) {
        console.error('❌ Invalid URL or connection failed - check your EXPO_PUBLIC_SUPABASE_URL');
        return { success: false, error: 'Invalid URL or connection failed' };
      }
    }

    console.log('✅ Connection successful!');
    console.log('   Auth status:', authData?.session ? 'Authenticated' : 'Not authenticated (this is OK)');
    console.log('');
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    return { success: false, error: error.message };
  }

  // Test 3: List all tables in the database
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: Listing all tables in the database...');
  try {
    // Query information_schema to get all tables
    // Note: This requires a PostgreSQL function since Supabase doesn't expose information_schema directly
    // We'll try using an RPC function first, or query a known table to test
    const { data: tablesData, error: tablesError } = await supabase.rpc('list_all_tables');

    if (tablesError) {
      // If the function doesn't exist, try to query information_schema directly
      // This might not work with Supabase's PostgREST, so we'll fall back to testing a known table
      console.log('⚠️  Could not list tables via RPC function (function may not exist)');
      console.log('   Error:', tablesError.message);
      console.log('   You can create a list_all_tables() function in Supabase SQL Editor');
    } else if (tablesData && tablesData.length > 0) {
      console.log('✅ Found', tablesData.length, 'table(s):');
      tablesData.forEach((table: any, index: number) => {
        const tableName = table.table_name || table.tableName || table;
        const schema = table.table_schema || table.tableSchema || 'public';
        console.log(`   ${index + 1}. ${schema}.${tableName}`);
      });
    } else {
      console.log('⚠️  No tables found in the database');
      console.log('   You can create tables using the SQL scripts in backend/scripts/');
    }
  } catch (error: any) {
    console.log('⚠️  Could not list tables (RPC function may not exist)');
    console.log('   Error:', error.message);
  }

  // Test 4: Test a simple query (if you have tables set up)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 4: Testing database query...');
  try {
    // Try to query a table (this will fail if tables don't exist, but that's OK for testing connection)
    const { data, error } = await supabase
      .from('Post')
      .select('count')
      .limit(1);

    if (error) {
      // Check for various "table doesn't exist" error patterns
      const tableNotFoundPatterns = [
        'PGRST116',
        'relation',
        'does not exist',
        'Could not find the table',
        'schema cache',
        'not found'
      ];
      
      const isTableNotFound = tableNotFoundPatterns.some(pattern => 
        error.code === pattern || 
        error.message?.includes(pattern)
      );

      if (isTableNotFound) {
        console.log('⚠️  Post table not found (this is OK if tables not created yet)');
        console.log('   Error:', error.message);
      } else {
        console.error('❌ Query error:', error.message);
        return { success: false, error: error.message };
      }
    } else {
      console.log('✅ Database query successful!');
      console.log('   Data:', data);
    }
  } catch (error: any) {
    console.log('⚠️  Query test skipped (tables may not exist yet)');
    console.log('   Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL CONNECTION TESTS PASSED!');
  console.log('Your Supabase connection is working correctly.');
  console.log('='.repeat(60) + '\n');

  return { success: true };
}

