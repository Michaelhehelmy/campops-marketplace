import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { createReviewSchema, updateReviewSchema } from '../schemas.js';

export function registerRoutes(api: PluginAPI) {
  // POST /api/p/reviews — Create a review
  api.registerRoute('/api/p/reviews', async (req: any) => {
    try {
      const session = await api.auth.getSession(req);
      if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const body = await req.json();
      const validated = createReviewSchema.parse(body);

      const booking = await api.db.queryOne(
        'SELECT id, listing_id, guest_email, status FROM plugin_booking_bookings WHERE id = ?',
        [validated.bookingId]
      );

      if (!booking) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
      }

      if (booking.guest_email !== session.user.email) {
        return new Response(JSON.stringify({ error: 'This booking does not belong to you' }), { status: 403 });
      }

      if (booking.status !== 'checked_out') {
        return new Response(JSON.stringify({ error: 'You can only review completed stays' }), { status: 400 });
      }

      const existing = await api.db.queryOne(
        'SELECT id FROM plugin_reviews_reviews WHERE booking_id = ?',
        [validated.bookingId]
      );

      if (existing) {
        return new Response(JSON.stringify({ error: 'You have already reviewed this booking' }), { status: 409 });
      }

      const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      await api.db.execute(
        `INSERT INTO plugin_reviews_reviews (id, booking_id, listing_id, guest_id, rating, title, comment, is_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [id, validated.bookingId, booking.listing_id, session.user.id, validated.rating, validated.title || '', validated.comment, now, now]
      );

      await api.db.execute(
        `UPDATE properties SET review_count = review_count + 1, avg_rating = (
          SELECT ROUND(AVG(rating), 1) FROM plugin_reviews_reviews WHERE listing_id = ?
        ) WHERE id = ?`,
        [booking.listing_id, booking.listing_id]
      );

      await api.executeHook('GUEST_REVIEWED', {
        reviewId: id,
        bookingId: validated.bookingId,
        listingId: booking.listing_id,
        guestId: session.user.id,
        rating: validated.rating,
        timestamp: new Date().toISOString(),
      });

      return new Response(JSON.stringify({
        id,
        bookingId: validated.bookingId,
        listingId: booking.listing_id,
        rating: validated.rating,
        title: validated.title || '',
        comment: validated.comment,
      }), { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return new Response(JSON.stringify({ error: error.errors }), { status: 400 });
      }
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  });

  // GET /api/p/reviews/listing/:listingId — List reviews for a listing
  api.registerRoute('/api/p/reviews/listing/:listingId', {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const listingId = url.searchParams.get(':listingId') || url.pathname.split('/').pop() || '';
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const reviews = await api.db.query(
          `SELECT r.id, r.rating, r.title, r.comment, r.is_verified, r.created_at,
                  u.name AS guest_name
           FROM plugin_reviews_reviews r
           LEFT JOIN users u ON r.guest_id = u.id
           WHERE r.listing_id = ?
           ORDER BY r.created_at DESC
           LIMIT ? OFFSET ?`,
          [listingId, limit, offset]
        );

        const countRow = await api.db.queryOne(
          'SELECT COUNT(*) as count FROM plugin_reviews_reviews WHERE listing_id = ?',
          [listingId]
        );

        return new Response(JSON.stringify({
          reviews: (reviews as any[]).map((r: any) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            isVerified: !!r.is_verified,
            guestName: r.guest_name,
            createdAt: r.created_at,
          })),
          total: countRow?.count ?? 0,
        }), { status: 200 });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  // GET /api/p/reviews/stats/:listingId — Aggregate rating stats for a listing
  api.registerRoute('/api/p/reviews/stats/:listingId', {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const listingId = url.searchParams.get(':listingId') || url.pathname.split('/').pop() || '';

        const property = await api.db.queryOne(
          'SELECT avg_rating, review_count FROM properties WHERE id = ?',
          [listingId]
        );

        const distribution = await api.db.query(
          `SELECT rating, COUNT(*) as count FROM plugin_reviews_reviews WHERE listing_id = ? GROUP BY rating ORDER BY rating DESC`,
          [listingId]
        );

        const distMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const row of distribution as any[]) {
          distMap[row.rating] = row.count;
        }

        return new Response(JSON.stringify({
          avgRating: property?.avg_rating ?? 0,
          reviewCount: property?.review_count ?? 0,
          distribution: distMap,
        }), { status: 200 });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  // GET /api/p/reviews/:id — Get single review
  api.registerRoute('/api/p/reviews/:id', {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const reviewId = url.searchParams.get(':id') || url.pathname.split('/').pop() || '';

        const review = await api.db.queryOne(
          `SELECT r.id, r.rating, r.title, r.comment, r.is_verified, r.created_at, r.updated_at,
                  r.listing_id, r.guest_id, r.booking_id,
                  u.name AS guest_name, p.name AS property_name
           FROM plugin_reviews_reviews r
           LEFT JOIN users u ON r.guest_id = u.id
           LEFT JOIN properties p ON r.listing_id = p.id
           WHERE r.id = ?`,
          [reviewId]
        );

        if (!review) {
          return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
        }

        return new Response(JSON.stringify({
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isVerified: !!review.is_verified,
          guestName: review.guest_name,
          propertyName: review.property_name,
          listingId: review.listing_id,
          bookingId: review.booking_id,
          createdAt: review.created_at,
          updatedAt: review.updated_at,
        }), { status: 200 });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  // PUT /api/p/reviews/:id — Update own review
  api.registerRoute('/api/p/reviews/:id', {
    PUT: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const url = new URL(req.url);
        const reviewId = url.searchParams.get(':id') || url.pathname.split('/').pop() || '';

        const review = await api.db.queryOne(
          'SELECT id, guest_id, rating FROM plugin_reviews_reviews WHERE id = ?',
          [reviewId]
        );

        if (!review) {
          return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
        }

        if (review.guest_id !== session.user.id) {
          return new Response(JSON.stringify({ error: 'You can only edit your own reviews' }), { status: 403 });
        }

        const body = await req.json();
        const validated = updateReviewSchema.parse(body);
        const now = Date.now();

        const updates: string[] = [];
        const params: any[] = [];

        if (validated.rating !== undefined) {
          updates.push('rating = ?');
          params.push(validated.rating);
        }
        if (validated.title !== undefined) {
          updates.push('title = ?');
          params.push(validated.title);
        }
        if (validated.comment !== undefined) {
          updates.push('comment = ?');
          params.push(validated.comment);
        }

        if (updates.length === 0) {
          return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
        }

        updates.push('updated_at = ?');
        params.push(now);
        params.push(reviewId);

        await api.db.execute(
          `UPDATE plugin_reviews_reviews SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        if (validated.rating !== undefined) {
          const listing = await api.db.queryOne(
            'SELECT listing_id FROM plugin_reviews_reviews WHERE id = ?',
            [reviewId]
          );
          if (listing) {
            await api.db.execute(
              `UPDATE properties SET avg_rating = (
                SELECT ROUND(AVG(rating), 1) FROM plugin_reviews_reviews WHERE listing_id = ?
              ) WHERE id = ?`,
              [listing.listing_id, listing.listing_id]
            );
          }
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return new Response(JSON.stringify({ error: error.errors }), { status: 400 });
        }
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  // DELETE /api/p/reviews/:id — Delete a review
  api.registerRoute('/api/p/reviews/:id', {
    DELETE: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const url = new URL(req.url);
        const reviewId = url.searchParams.get(':id') || url.pathname.split('/').pop() || '';

        const review = await api.db.queryOne(
          'SELECT id, guest_id, listing_id FROM plugin_reviews_reviews WHERE id = ?',
          [reviewId]
        );

        if (!review) {
          return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
        }

        const role = session.user.role as string;
        if (review.guest_id !== session.user.id && !['master', 'admin'].includes(role)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
        }

        await api.db.execute('DELETE FROM plugin_reviews_reviews WHERE id = ?', [reviewId]);

        await api.db.execute(
          `UPDATE properties SET review_count = review_count - 1, avg_rating = (
            SELECT COALESCE(ROUND(AVG(rating), 1), 0) FROM plugin_reviews_reviews WHERE listing_id = ?
          ) WHERE id = ?`,
          [review.listing_id, review.listing_id]
        );

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });
}
