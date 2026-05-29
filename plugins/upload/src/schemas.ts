import { z } from 'zod';

export const uploadFileSchema = z.object({
  purpose: z.enum(['avatar', 'booking_attachment', 'general']).optional().default('general'),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;

export const deleteFileSchema = z.object({
  fileId: z.string().min(1),
});

export const bookingAttachmentSchema = z.object({
  bookingId: z.string().min(1),
});

export const serveFileSchema = z.object({
  id: z.string().min(1),
});
