-- Sprint 1: Dossier Collaborateur Schema Migration
-- Safe, non-destructive migration for adding new columns
-- Target: Supabase PostgreSQL
-- Date: 2026-03-24

BEGIN;

-- =========================================================
-- ALTER USERS TABLE: Add banking and phone fields
-- =========================================================
ALTER TABLE IF EXISTS users
ADD COLUMN IF NOT EXISTS phone_fixed TEXT,
ADD COLUMN IF NOT EXISTS bank_bic_swift TEXT;

-- =========================================================
-- ALTER CONTRACTS TABLE: Add salary breakdown fields
-- =========================================================
ALTER TABLE IF EXISTS contracts
ADD COLUMN IF NOT EXISTS net_salary NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS bonuses NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS benefits_in_kind TEXT;

-- =========================================================
-- ALTER DOCUMENTS TABLE: Add versioning and metadata fields
-- =========================================================
ALTER TABLE IF EXISTS documents
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS original_name TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Add constraint for version_number if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'documents' AND constraint_name = 'documents_version_chk'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT documents_version_chk CHECK (version_number > 0);
  END IF;
END$$;

-- =========================================================
-- ADD INDEX: Efficient document versioning queries
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_documents_user_title_category_version 
ON documents(user_id, title, category, version_number);

-- =========================================================
-- COMMIT
-- =========================================================
COMMIT;
