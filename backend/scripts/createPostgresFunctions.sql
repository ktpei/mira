-- PostgreSQL Functions for Supabase
-- These functions can be called from your React Native app via supabase.rpc()

-- Function to list all tables in the public schema
CREATE OR REPLACE FUNCTION list_all_tables()
RETURNS TABLE (
  table_name TEXT,
  table_schema TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    t.table_schema::TEXT
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$$;

-- Example: Function to get user posts
CREATE OR REPLACE FUNCTION get_user_posts(user_id_param INT)
RETURNS TABLE (
  postID INT,
  caption TEXT,
  uploadedAt TIMESTAMP,
  visibility VARCHAR(20),
  userID INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.postID,
    p.caption,
    p.uploadedAt,
    p.visibility::VARCHAR,
    p.userID
  FROM Post p
  WHERE p.userID = user_id_param
  ORDER BY p.uploadedAt DESC;
END;
$$;

-- Example: Function to create a new post
CREATE OR REPLACE FUNCTION create_post(
  caption_param TEXT,
  visibility_param VARCHAR(20) DEFAULT 'public',
  location_id_param INT DEFAULT NULL,
  captured_at_param TIMESTAMP DEFAULT NULL,
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
  INSERT INTO Post (
    caption,
    visibility,
    locationID,
    capturedAt,
    userID,
    uploadedAt
  )
  VALUES (
    caption_param,
    visibility_param::post_visibility_enum,
    location_id_param,
    captured_at_param,
    user_id_param,
    NOW()
  )
  RETURNING postID INTO new_post_id;

  RETURN QUERY
  SELECT 
    p.postID,
    p.caption,
    p.uploadedAt
  FROM Post p
  WHERE p.postID = new_post_id;
END;
$$;

-- Example: Function to get posts with photos
CREATE OR REPLACE FUNCTION get_posts_with_photos(user_id_param INT DEFAULT NULL)
RETURNS TABLE (
  postID INT,
  caption TEXT,
  uploadedAt TIMESTAMP,
  photoCount INT,
  photoUrls TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.postID,
    p.caption,
    p.uploadedAt,
    COUNT(ph.photoID)::INT as photoCount,
    ARRAY_AGG(ph.url) FILTER (WHERE ph.url IS NOT NULL) as photoUrls
  FROM Post p
  LEFT JOIN Photo ph ON p.postID = ph.postID
  WHERE (user_id_param IS NULL OR p.userID = user_id_param)
    AND p.visibility = 'public'
  GROUP BY p.postID, p.caption, p.uploadedAt
  ORDER BY p.uploadedAt DESC;
END;
$$;

-- Example: Function to search posts by caption
CREATE OR REPLACE FUNCTION search_posts(search_term TEXT)
RETURNS TABLE (
  postID INT,
  caption TEXT,
  uploadedAt TIMESTAMP,
  userID INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.postID,
    p.caption,
    p.uploadedAt,
    p.userID
  FROM Post p
  WHERE p.caption ILIKE '%' || search_term || '%'
    AND p.visibility = 'public'
  ORDER BY p.uploadedAt DESC
  LIMIT 50;
END;
$$;

