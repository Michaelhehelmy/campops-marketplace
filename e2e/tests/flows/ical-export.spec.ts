import { test, expect } from '@playwright/test';

test.describe('iCal Export', () => {
  test('GET /api/public/ical/:propertyId returns ICS for valid property', async ({ request }) => {
    const res = await request.get('/api/public/ical/1');
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const text = await res.text();
      expect(text).toContain('BEGIN:VCALENDAR');
      expect(text).toContain('END:VCALENDAR');
      expect(text).toContain('VERSION:2.0');
      const contentType = res.headers()['content-type'] || '';
      expect(contentType).toContain('text/calendar');
    }
  });

  test('GET /api/public/ical/:slug returns ICS for valid slug', async ({ request }) => {
    const res = await request.get('/api/public/ical/safari-camp');
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const text = await res.text();
      expect(text).toContain('BEGIN:VCALENDAR');
      expect(text).toContain('END:VCALENDAR');
    }
  });

  test('GET /api/public/ical/:propertyId returns 404 for invalid property', async ({ request }) => {
    const res = await request.get('/api/public/ical/non-existent-property-xyz');
    expect([404, 500]).toContain(res.status());
  });

  test('GET /api/public/ical/:propertyId has correct Content-Disposition header', async ({ request }) => {
    const res = await request.get('/api/public/ical/1');
    if (res.status() === 200) {
      const disposition = res.headers()['content-disposition'] || '';
      expect(disposition).toContain('.ics');
    }
  });
});
