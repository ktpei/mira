-- PostgreSQL functions for heat map feature
-- Run these in your Supabase SQL Editor

-- First, create the locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.locations (
  location_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  name character varying,
  address character varying,
  city character varying,
  country character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (location_id),
  CONSTRAINT locations_coordinates_check CHECK (
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
  )
);

-- Add foreign key constraint to posts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'posts_location_id_fkey'
  ) THEN
    ALTER TABLE public.posts
    ADD CONSTRAINT posts_location_id_fkey 
    FOREIGN KEY (location_id) REFERENCES public.locations(location_id);
  END IF;
END $$;

-- Create index on coordinates for faster spatial queries
CREATE INDEX IF NOT EXISTS idx_locations_coordinates 
ON public.locations(latitude, longitude);

-- Function to create or find a location
-- If a location with similar coordinates exists (within ~100m), returns that location
-- Otherwise, creates a new location entry
CREATE OR REPLACE FUNCTION create_or_find_location(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_name VARCHAR DEFAULT NULL,
  p_address VARCHAR DEFAULT NULL,
  p_city VARCHAR DEFAULT NULL,
  p_country VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  location_id BIGINT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  name VARCHAR,
  address VARCHAR,
  city VARCHAR,
  country VARCHAR
) AS $$
DECLARE
  v_location_id BIGINT;
  -- Tolerance: approximately 100 meters in degrees (rough approximation)
  -- 1 degree latitude ≈ 111 km, so 0.001 ≈ 111m
  -- For longitude, it varies by latitude, but we'll use a similar value
  tolerance DOUBLE PRECISION := 0.001;
BEGIN
  -- Try to find existing location within tolerance
  SELECT loc.location_id INTO v_location_id
  FROM locations loc
  WHERE ABS(loc.latitude - p_latitude) < tolerance
    AND ABS(loc.longitude - p_longitude) < tolerance
  LIMIT 1;

  -- If found, return existing location
  IF v_location_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      loc.location_id,
      loc.latitude,
      loc.longitude,
      loc.name,
      loc.address,
      loc.city,
      loc.country
    FROM locations loc
    WHERE loc.location_id = v_location_id;
    RETURN;
  END IF;

  -- Otherwise, create new location
  INSERT INTO locations (latitude, longitude, name, address, city, country)
  VALUES (p_latitude, p_longitude, p_name, p_address, p_city, p_country)
  RETURNING 
    locations.location_id,
    locations.latitude,
    locations.longitude,
    locations.name,
    locations.address,
    locations.city,
    locations.country
  INTO 
    v_location_id,
    latitude,
    longitude,
    name,
    address,
    city,
    country;

  -- Return the newly created location
  RETURN QUERY
  SELECT 
    v_location_id,
    latitude,
    longitude,
    name,
    address,
    city,
    country;
END;
$$ LANGUAGE plpgsql;

-- Function to get public posts with locations within map bounds
CREATE OR REPLACE FUNCTION get_public_posts_with_locations(
  p_north_lat DOUBLE PRECISION,
  p_south_lat DOUBLE PRECISION,
  p_east_lng DOUBLE PRECISION,
  p_west_lng DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id BIGINT,
  caption TEXT,
  uploaded_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  photo_urls TEXT[],
  like_count BIGINT,
  comment_count BIGINT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_id BIGINT,
  user_id UUID,
  username VARCHAR,
  profile_pic VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.post_id,
    p.caption,
    p.uploaded_at,
    p.captured_at,
    COALESCE(
      ARRAY_AGG(DISTINCT ph.url) FILTER (WHERE ph.url IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS photo_urls,
    COUNT(DISTINCT l.like_id) AS like_count,
    COUNT(DISTINCT c.comment_id) AS comment_count,
    loc.latitude,
    loc.longitude,
    loc.location_id,
    p.user_id,
    pr.username,
    pr.profile_pic
  FROM posts p
  INNER JOIN locations loc ON p.location_id = loc.location_id
  LEFT JOIN profiles pr ON p.user_id = pr.user_id
  LEFT JOIN photos ph ON p.post_id = ph.post_id
  LEFT JOIN likes l ON p.post_id = l.post_id
  LEFT JOIN comments c ON p.post_id = c.post_id
  WHERE p.visibility = 'public'
    AND loc.latitude BETWEEN p_south_lat AND p_north_lat
    AND loc.longitude BETWEEN p_west_lng AND p_east_lng
    AND loc.latitude IS NOT NULL
    AND loc.longitude IS NOT NULL
  GROUP BY 
    p.post_id,
    p.caption,
    p.uploaded_at,
    p.captured_at,
    loc.latitude,
    loc.longitude,
    loc.location_id,
    p.user_id,
    pr.username,
    pr.profile_pic
  ORDER BY p.uploaded_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get local posts within a radius
CREATE OR REPLACE FUNCTION get_local_posts(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 10,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id BIGINT,
  caption TEXT,
  uploaded_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  photo_urls TEXT[],
  like_count BIGINT,
  comment_count BIGINT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_id BIGINT,
  user_id UUID,
  username VARCHAR,
  profile_pic VARCHAR,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  WITH post_locations AS (
    SELECT 
      p.post_id,
      p.caption,
      p.uploaded_at,
      p.captured_at,
      COALESCE(
        ARRAY_AGG(DISTINCT ph.url) FILTER (WHERE ph.url IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS photo_urls,
      COUNT(DISTINCT l.like_id) AS like_count,
      COUNT(DISTINCT c.comment_id) AS comment_count,
      loc.latitude,
      loc.longitude,
      loc.location_id,
      p.user_id,
      pr.username,
      pr.profile_pic,
      -- Calculate distance using Haversine formula (approximate)
      (
        6371 * acos(
          cos(radians(p_latitude)) *
          cos(radians(loc.latitude)) *
          cos(radians(loc.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) *
          sin(radians(loc.latitude))
        )
      ) AS distance_km
    FROM posts p
    INNER JOIN locations loc ON p.location_id = loc.location_id
    LEFT JOIN profiles pr ON p.user_id = pr.user_id
    LEFT JOIN photos ph ON p.post_id = ph.post_id
    LEFT JOIN likes l ON p.post_id = l.post_id
    LEFT JOIN comments c ON p.post_id = c.post_id
    WHERE p.visibility = 'public'
      AND loc.latitude IS NOT NULL
      AND loc.longitude IS NOT NULL
    GROUP BY 
      p.post_id,
      p.caption,
      p.uploaded_at,
      p.captured_at,
      loc.latitude,
      loc.longitude,
      loc.location_id,
      p.user_id,
      pr.username,
      pr.profile_pic
    HAVING (
      6371 * acos(
        cos(radians(p_latitude)) *
        cos(radians(loc.latitude)) *
        cos(radians(loc.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(loc.latitude))
      )
    ) <= p_radius_km
  )
  SELECT * FROM post_locations
  ORDER BY distance_km ASC, uploaded_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

