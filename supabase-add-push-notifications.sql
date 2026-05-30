-- Push notification support — device tokens per user
-- Used by FCM (Firebase Cloud Messaging) to deliver push notifications

CREATE TABLE IF NOT EXISTS device_tokens (
  id         uuid      DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      text      NOT NULL,
  platform   text      NOT NULL DEFAULT 'web',  -- 'web' | 'ios' | 'android'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own device tokens" ON device_tokens;
CREATE POLICY "users manage own device tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Index for efficient lookup by user_id
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
