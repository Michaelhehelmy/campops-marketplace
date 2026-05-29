/**
 * Upload Plugin — Sprint 2
 * ─────────────────────────
 * Provides file upload, storage, and retrieval for guest avatars
 * and booking attachments. Other plugins can depend on this for
 * storage capability.
 *
 * Tables:
 *   plugin_upload_files               — file metadata (local disk storage)
 *   plugin_upload_booking_attachments — booking↔file join
 *
 * Routes:
 *   POST   /api/p/upload                          — Upload any file
 *   GET    /api/p/upload/:id                      — File metadata
 *   GET    /api/p/upload/:id/download             — Download file
 *   DELETE /api/p/upload/:id                      — Delete file
 *   POST   /api/p/upload/booking/:bookingId       — Upload booking attachment
 *   GET    /api/p/upload/booking/:bookingId       — List booking attachments
 *   DELETE /api/p/upload/booking/:bookingId/:fileId — Remove attachment
 */

import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { registerRoutes } from './api/routes.js';

export default async function init(api: PluginAPI): Promise<void> {
  await api.db.createTable(
    'files',
    `id TEXT PRIMARY KEY,
     original_name TEXT NOT NULL,
     mime_type TEXT NOT NULL,
     size INTEGER NOT NULL,
     storage_path TEXT NOT NULL,
     uploaded_by TEXT NOT NULL,
     purpose TEXT NOT NULL DEFAULT 'general',
     created_at INTEGER NOT NULL`
  );

  await api.db.createTable(
    'booking_attachments',
    `id TEXT PRIMARY KEY,
     booking_id TEXT NOT NULL,
     file_id TEXT NOT NULL,
     uploaded_by TEXT NOT NULL,
     created_at INTEGER NOT NULL`
  );

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_upload_files_uploaded_by ON plugin_upload_files(uploaded_by)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_upload_files_purpose ON plugin_upload_files(purpose)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_upload_booking_att_booking ON plugin_upload_booking_attachments(booking_id)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_upload_booking_att_file ON plugin_upload_booking_attachments(file_id)');

  registerRoutes(api);

  api.logger.info('[upload] Plugin initialised — tables created, routes registered');
}
