import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { uploadFileSchema, bookingAttachmentSchema } from '../schemas.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function generateFileName(originalName: string): string {
  const ext = path.extname(originalName) || '';
  const hash = crypto.randomBytes(16).toString('hex');
  return `${hash}${ext}`;
}

export function registerRoutes(api: PluginAPI) {
  ensureUploadsDir();

  // POST /api/p/upload — Upload a file
  api.registerRoute('/api/p/upload', {
    POST: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        let formData: FormData;
        try {
          formData = await req.formData();
        } catch {
          return new Response(JSON.stringify({ error: 'Request must be multipart/form-data' }), { status: 400 });
        }

        const purposeParam = formData.get('purpose') as string || 'general';
        const parsed = uploadFileSchema.safeParse({ purpose: purposeParam });
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Invalid purpose', details: parsed.error.issues }), { status: 400 });
        }

        const file = formData.get('file') as File | null;
        if (!file) {
          return new Response(JSON.stringify({ error: 'No file provided. Use field name "file"' }), { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
          return new Response(JSON.stringify({ error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` }), { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return new Response(JSON.stringify({ error: `File type ${file.type} not allowed` }), { status: 400 });
        }

        const storageName = generateFileName(file.name);
        const storagePath = path.join(UPLOADS_DIR, storageName);
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(storagePath, buffer);

        const fileId = `file_${crypto.randomBytes(12).toString('hex')}`;
        await api.db.execute(
          `INSERT INTO plugin_upload_files (id, original_name, mime_type, size, storage_path, uploaded_by, purpose, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [fileId, file.name, file.type, file.size, storageName, session.user.id, parsed.data.purpose, Date.now()]
        );

        api.logger.info(`[upload] File saved: ${fileId} (${file.name}, ${file.type}, ${file.size} bytes)`);

        return new Response(JSON.stringify({
          id: fileId,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          url: `/api/p/upload/${fileId}/download`,
          purpose: parsed.data.purpose,
        }), { status: 201 });
      } catch (err: any) {
        api.logger.error('[upload] POST upload error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });

  // GET /api/p/upload/:id — Get file metadata
  api.registerRoute('/api/p/upload/:id', {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const fileId = url.searchParams.get(':id') || url.pathname.split('/').pop();

        const file = await api.db.queryOne('SELECT * FROM plugin_upload_files WHERE id = ?', [fileId]);
        if (!file) {
          return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 });
        }

        return new Response(JSON.stringify({
          id: (file as any).id,
          originalName: (file as any).original_name,
          mimeType: (file as any).mime_type,
          size: (file as any).size,
          purpose: (file as any).purpose,
          uploadedBy: (file as any).uploaded_by,
          createdAt: (file as any).created_at,
          url: `/api/p/upload/${(file as any).id}/download`,
        }), { status: 200 });
      } catch (err: any) {
        api.logger.error('[upload] GET metadata error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });

  // GET /api/p/upload/:id/download — Download/serve file
  api.registerRoute('/api/p/upload/:id/download', {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const fileId = url.searchParams.get(':id') || url.pathname.split('/').slice(-2)[0];

        const file = await api.db.queryOne('SELECT * FROM plugin_upload_files WHERE id = ?', [fileId]);
        if (!file) {
          return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 });
        }

        const storagePath = path.join(UPLOADS_DIR, (file as any).storage_path);
        if (!fs.existsSync(storagePath)) {
          return new Response(JSON.stringify({ error: 'File data missing from disk' }), { status: 404 });
        }

        const content = fs.readFileSync(storagePath);
        return new Response(content, {
          status: 200,
          headers: {
            'Content-Type': (file as any).mime_type,
            'Content-Disposition': `inline; filename="${(file as any).original_name}"`,
            'Content-Length': String((file as any).size),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (err: any) {
        api.logger.error('[upload] GET download error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });

  // DELETE /api/p/upload/:id — Delete a file (owner or admin only)
  api.registerRoute('/api/p/upload/:id', {
    DELETE: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const url = new URL(req.url);
        const fileId = url.searchParams.get(':id') || url.pathname.split('/').pop();

        const file = await api.db.queryOne('SELECT * FROM plugin_upload_files WHERE id = ?', [fileId]);
        if (!file) {
          return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 });
        }

        const isOwner = (file as any).uploaded_by === session.user.id;
        const isAdmin = ['master', 'admin'].includes(session.user.role as string);
        if (!isOwner && !isAdmin) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        const storagePath = path.join(UPLOADS_DIR, (file as any).storage_path);
        if (fs.existsSync(storagePath)) {
          fs.unlinkSync(storagePath);
        }

        await api.db.execute('DELETE FROM plugin_upload_files WHERE id = ?', [fileId]);
        api.logger.info(`[upload] File deleted: ${fileId}`);

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      } catch (err: any) {
        api.logger.error('[upload] DELETE error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });

  // POST /api/p/upload/booking/:bookingId — Upload attachment for a booking
  api.registerRoute('/api/p/upload/booking/:bookingId', {
    POST: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const url = new URL(req.url);
        const bookingId = url.searchParams.get(':bookingId') || url.pathname.split('/').slice(-2)[0];

        const booking = await api.db.queryOne('SELECT id FROM plugin_booking_bookings WHERE id = ?', [bookingId]);
        if (!booking) {
          return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
        }

        let formData: FormData;
        try {
          formData = await req.formData();
        } catch {
          return new Response(JSON.stringify({ error: 'Request must be multipart/form-data' }), { status: 400 });
        }

        const file = formData.get('file') as File | null;
        if (!file) {
          return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
          return new Response(JSON.stringify({ error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` }), { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return new Response(JSON.stringify({ error: `File type ${file.type} not allowed` }), { status: 400 });
        }

        const storageName = generateFileName(file.name);
        const storagePath = path.join(UPLOADS_DIR, storageName);
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(storagePath, buffer);

        const fileId = `file_${crypto.randomBytes(12).toString('hex')}`;
        await api.db.execute(
          `INSERT INTO plugin_upload_files (id, original_name, mime_type, size, storage_path, uploaded_by, purpose, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'booking_attachment', ?)`,
          [fileId, file.name, file.type, file.size, storageName, session.user.id, Date.now()]
        );

        const attachmentId = `att_${crypto.randomBytes(8).toString('hex')}`;
        await api.db.execute(
          `INSERT INTO plugin_upload_booking_attachments (id, booking_id, file_id, uploaded_by, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [attachmentId, bookingId, fileId, session.user.id, Date.now()]
        );

        api.logger.info(`[upload] Booking attachment saved: ${fileId} for booking ${bookingId}`);

        return new Response(JSON.stringify({
          attachmentId,
          fileId,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          url: `/api/p/upload/${fileId}/download`,
        }), { status: 201 });
      } catch (err: any) {
        api.logger.error('[upload] POST booking attachment error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });

  // GET /api/p/upload/booking/:bookingId — List booking attachments
  api.registerRoute('/api/p/upload/booking/:bookingId', {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const bookingId = url.searchParams.get(':bookingId') || url.pathname.split('/').pop();

        const attachments = await api.db.query(
          `SELECT a.id AS attachment_id, a.created_at AS attached_at,
                  f.id AS file_id, f.original_name, f.mime_type, f.size, f.created_at
           FROM plugin_upload_booking_attachments a
           JOIN plugin_upload_files f ON a.file_id = f.id
           WHERE a.booking_id = ?
           ORDER BY a.created_at DESC`,
          [bookingId]
        );

        return new Response(JSON.stringify({
          attachments: (attachments as any[]).map((a: any) => ({
            attachmentId: a.attachment_id,
            fileId: a.file_id,
            originalName: a.original_name,
            mimeType: a.mime_type,
            size: a.size,
            url: `/api/p/upload/${a.file_id}/download`,
            createdAt: a.attached_at || a.created_at,
          })),
        }), { status: 200 });
      } catch (err: any) {
        api.logger.error('[upload] GET booking attachments error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });

  // DELETE /api/p/upload/booking/:bookingId/:fileId — Remove attachment
  api.registerRoute('/api/p/upload/booking/:bookingId/:fileId', {
    DELETE: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const url = new URL(req.url);
        const parts = url.pathname.split('/');
        const fileId = parts.pop();
        const bookingId = parts.pop();

        const attachment = await api.db.queryOne(
          'SELECT id FROM plugin_upload_booking_attachments WHERE booking_id = ? AND file_id = ?',
          [bookingId, fileId]
        );
        if (!attachment) {
          return new Response(JSON.stringify({ error: 'Attachment not found' }), { status: 404 });
        }

        const file = await api.db.queryOne('SELECT * FROM plugin_upload_files WHERE id = ?', [fileId]);
        const isOwner = file && (file as any).uploaded_by === session.user.id;
        const isAdmin = ['master', 'admin'].includes(session.user.role as string);
        if (!isOwner && !isAdmin) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        await api.db.execute(
          'DELETE FROM plugin_upload_booking_attachments WHERE booking_id = ? AND file_id = ?',
          [bookingId, fileId]
        );

        if (file) {
          const storagePath = path.join(UPLOADS_DIR, (file as any).storage_path);
          if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath);
          await api.db.execute('DELETE FROM plugin_upload_files WHERE id = ?', [fileId]);
        }

        api.logger.info(`[upload] Removed attachment ${fileId} from booking ${bookingId}`);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      } catch (err: any) {
        api.logger.error('[upload] DELETE booking attachment error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });
}
