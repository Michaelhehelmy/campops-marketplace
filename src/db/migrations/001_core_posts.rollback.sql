-- Rollback: 001_core_posts
-- Removes all tables created by 001_core_posts.sql.
-- WARNING: This will permanently destroy all post, option, and site data.

DROP INDEX IF EXISTS idx_options_autoload;
DROP INDEX IF EXISTS idx_options_site_name;
DROP TABLE IF EXISTS options;

DROP INDEX IF EXISTS idx_postmeta_key_value;
DROP INDEX IF EXISTS idx_postmeta_post_key;
DROP TABLE IF EXISTS postmeta;

DROP INDEX IF EXISTS uq_posts_site_type_slug;
DROP INDEX IF EXISTS idx_posts_parent;
DROP INDEX IF EXISTS idx_posts_author;
DROP INDEX IF EXISTS idx_posts_site_slug;
DROP INDEX IF EXISTS idx_posts_site_type_status;
DROP INDEX IF EXISTS idx_posts_site_type;
DROP TABLE IF EXISTS posts;

DROP INDEX IF EXISTS idx_sites_custom_domain;
DROP INDEX IF EXISTS idx_sites_subdomain;
DROP INDEX IF EXISTS idx_sites_slug;
DROP TABLE IF EXISTS sites;

DROP TABLE IF EXISTS schema_migrations;
