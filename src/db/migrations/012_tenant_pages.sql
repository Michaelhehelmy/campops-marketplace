-- Migration: 012_tenant_pages
-- Description: Tenant CMS pages and sections for tenant websites
-- Depends on: 011_add_perf_indexes

CREATE TABLE IF NOT EXISTS tenant_pages (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    meta TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(property_id, slug)
);

CREATE TABLE IF NOT EXISTS tenant_sections (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES tenant_pages(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    title TEXT,
    content TEXT,
    media TEXT,
    config TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_tenant_pages_property ON tenant_pages(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sections_page ON tenant_sections(page_id);
