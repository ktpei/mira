-- PostgreSQL function to delete a post and all related data
-- This function ensures proper cascading deletion of related records

CREATE OR REPLACE FUNCTION delete_post(
  p_post_id BIGINT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_post_user_id UUID;
BEGIN
  -- First, verify that the post exists and belongs to the user
  SELECT user_id INTO v_post_user_id
  FROM posts
  WHERE post_id = p_post_id;

  -- Check if post exists
  IF v_post_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Post not found'::TEXT;
    RETURN;
  END IF;

  -- Check if user owns the post
  IF v_post_user_id != p_user_id THEN
    RETURN QUERY SELECT FALSE, 'You do not have permission to delete this post'::TEXT;
    RETURN;
  END IF;

  -- Delete related data (cascading deletes should handle this, but being explicit)
  -- Delete from collection_posts (junction table)
  DELETE FROM collection_posts WHERE post_id = p_post_id;

  -- Delete comments (cascading will handle nested comments)
  DELETE FROM comments WHERE post_id = p_post_id;

  -- Delete likes
  DELETE FROM likes WHERE post_id = p_post_id;

  -- Delete photos (this will also delete photo_tags via foreign key)
  DELETE FROM photos WHERE post_id = p_post_id;

  -- Finally, delete the post itself
  DELETE FROM posts WHERE post_id = p_post_id;

  -- Return success
  RETURN QUERY SELECT TRUE, 'Post deleted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_post(BIGINT, UUID) TO authenticated;

