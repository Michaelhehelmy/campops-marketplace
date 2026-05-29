-- Migration: 015_add_reviews
-- Description: Add avg_rating and review_count columns to properties table for aggregated reviews
-- Depends on: 014_add_avatar_url

ALTER TABLE properties ADD COLUMN avg_rating REAL DEFAULT 0;
ALTER TABLE properties ADD COLUMN review_count INTEGER DEFAULT 0;
