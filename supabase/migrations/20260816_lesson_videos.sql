-- Add classroom lesson videos table (YouTube/Live links only - no video storage in DB)
-- Teachers add video URLs, students watch them within the classroom

CREATE TABLE IF NOT EXISTS classroom_lesson_videos (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL,
  creator_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  video_type TEXT DEFAULT 'youtube', -- 'youtube' or 'live'
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE classroom_lesson_videos ENABLE ROW LEVEL SECURITY;

-- Students and teacher can read videos in their classroom
CREATE POLICY classroom_lesson_videos_read ON classroom_lesson_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_lesson_videos.class_id
      AND c.created_by = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM classroom_students cs
      WHERE cs.class_id = classroom_lesson_videos.class_id
      AND cs.student_id = auth.uid()::text
    )
  );

-- Teacher (creator) can insert videos
CREATE POLICY classroom_lesson_videos_insert ON classroom_lesson_videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_lesson_videos.class_id
      AND c.created_by = auth.uid()::text
    )
  );

-- Teacher can update own videos
CREATE POLICY classroom_lesson_videos_update ON classroom_lesson_videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_lesson_videos.class_id
      AND c.created_by = auth.uid()::text
    )
  );

-- Teacher can delete own videos
CREATE POLICY classroom_lesson_videos_delete ON classroom_lesson_videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_lesson_videos.class_id
      AND c.created_by = auth.uid()::text
    )
  );

-- Increment view count RPC
CREATE OR REPLACE FUNCTION increment_lesson_video_views(p_video_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE classroom_lesson_videos
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
