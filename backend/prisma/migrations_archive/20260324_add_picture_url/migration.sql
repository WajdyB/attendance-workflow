-- Add profile image column in both legacy and normalized table naming
ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "picture_url" TEXT;
ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
