-- Sharing records for Boogle Dox.
-- Apply this file to Supabase PostgreSQL when hosted auth is connected.
-- Local development applies it through PGlite after 001_documents.sql.

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_permissions (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS document_permissions_user_idx
  ON document_permissions (user_id);

INSERT INTO schema_migrations (id)
VALUES ('002_permissions')
ON CONFLICT (id) DO NOTHING;
