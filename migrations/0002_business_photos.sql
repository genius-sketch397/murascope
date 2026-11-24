CREATE TABLE IF NOT EXISTS business_photos(id INTEGER PRIMARY KEY,business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,object_key TEXT UNIQUE NOT NULL,content_type TEXT NOT NULL,size_bytes INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_business_photos ON business_photos(business_id,created_at);
