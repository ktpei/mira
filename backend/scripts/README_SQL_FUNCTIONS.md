# Using Raw SQL with Supabase

This guide explains how to execute raw SQL queries in Supabase by converting them into PostgreSQL functions.

## Overview

Supabase is built on PostgreSQL. To execute raw SQL from your React Native app, you need to:

1. **Create PostgreSQL Functions** - Convert your SQL queries into PostgreSQL stored procedures
2. **Call Functions via RPC** - Use `supabase.rpc()` to call these functions from your app
3. **Deploy Functions** - Run the SQL functions in your Supabase dashboard

## Method 1: Manual PostgreSQL Functions

### Step 1: Create a PostgreSQL Function

Write your SQL as a PostgreSQL function in Supabase:

```sql
CREATE OR REPLACE FUNCTION get_user_posts(user_id_param INT)
RETURNS TABLE (
  postID INT,
  caption TEXT,
  uploadedAt TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT postID, caption, uploadedAt
  FROM Post
  WHERE userID = user_id_param
  ORDER BY uploadedAt DESC;
END;
$$;
```

### Step 2: Deploy in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Paste and run your function SQL
4. The function is now available via RPC

### Step 3: Call from Your App

```typescript
import { supabase, executeSQLFunction } from '@/lib/supabase';

// Call the function
const { data, error } = await executeSQLFunction('get_user_posts', {
  user_id_param: 123
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Posts:', data);
}
```

## Method 2: Convert SQL Files to Functions

Use the `convertSQLToFunction.js` script to automatically convert SQL files:

```bash
# Convert a SELECT query
node backend/scripts/convertSQLToFunction.js query.sql get_user_posts '{"userId":"INT"}'

# Convert an INSERT query
node backend/scripts/convertSQLToFunction.js insert.sql create_post '{"caption":"TEXT","userId":"INT"}'
```

## Method 3: Direct SQL Execution (Server-Side Only)

⚠️ **WARNING**: Never execute raw SQL from the client! Always use PostgreSQL functions.

For server-side execution (Edge Functions, backend services):

```typescript
// Only in Edge Functions or backend with service role key
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key (server-side only!)
);

// Execute raw SQL
const { data, error } = await supabaseAdmin.rpc('exec_sql', {
  query: 'SELECT * FROM Post WHERE userID = $1',
  params: [userId]
});
```

## Example: Creating a Post

### 1. Create the Function in Supabase

```sql
CREATE OR REPLACE FUNCTION create_post(
  caption_param TEXT,
  visibility_param VARCHAR(20) DEFAULT 'public',
  user_id_param INT
)
RETURNS TABLE (
  postID INT,
  caption TEXT,
  uploadedAt TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_post_id INT;
BEGIN
  INSERT INTO Post (caption, visibility, userID, uploadedAt)
  VALUES (caption_param, visibility_param::post_visibility_enum, user_id_param, NOW())
  RETURNING postID INTO new_post_id;

  RETURN QUERY
  SELECT postID, caption, uploadedAt
  FROM Post
  WHERE postID = new_post_id;
END;
$$;
```

### 2. Use in Your App

```typescript
// In your create.tsx component
const handleCreatePost = async () => {
  const { data, error } = await executeSQLFunction('create_post', {
    caption_param: caption,
    visibility_param: visibility,
    user_id_param: currentUserId
  });

  if (error) {
    Alert.alert('Error', 'Failed to create post');
  } else {
    Alert.alert('Success', 'Post created!');
  }
};
```

## Security Best Practices

1. **Use SECURITY DEFINER** - Functions run with the permissions of the function creator
2. **Validate Input** - Always validate parameters in your functions
3. **Use Parameterized Queries** - Never concatenate user input into SQL
4. **Row Level Security (RLS)** - Enable RLS on your tables for additional security
5. **Never Expose Service Role Key** - Only use service role key server-side

## Converting Your Existing SQL Files

If you have SQL files in `backend/SQL scripts/`, you can:

1. **Manual Conversion**: Rewrite them as PostgreSQL functions
2. **Use the Converter**: Use `convertSQLToFunction.js` for simple queries
3. **Direct Migration**: Convert MySQL syntax to PostgreSQL and create functions

## PostgreSQL vs MySQL Differences

When converting your MySQL SQL to PostgreSQL:

- `AUTO_INCREMENT` → `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
- `DATETIME` → `TIMESTAMP`
- `VARCHAR` → `VARCHAR` (same)
- `INT` → `INTEGER` or `INT` (same)
- `ENUM` → `ENUM` (PostgreSQL supports ENUMs)
- Backticks → Double quotes or no quotes

## Next Steps

1. Set up your Supabase project
2. Create environment variables for Supabase URL and keys
3. Convert your SQL files to PostgreSQL functions
4. Deploy functions in Supabase dashboard
5. Use `executeSQLFunction()` in your app components

