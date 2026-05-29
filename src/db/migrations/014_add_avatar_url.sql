-- Migration: 014_add_avatar_url
-- Description: Add avatar_url column to profiles table for guest profile pictures
-- Depends on: 013_add_core_indexes

ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
