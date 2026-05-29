import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional().default(''),
  comment: z.string().min(1).max(5000),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  comment: z.string().min(1).max(5000).optional(),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
