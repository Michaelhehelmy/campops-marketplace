import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  EmailService,
  bookingConfirmationTemplate,
  paymentReceiptTemplate,
  reviewRequestTemplate,
  cancellationTemplate,
  newBookingNotificationTemplate,
} from '../email';

describe('EmailService', () => {
  afterEach(() => {
    EmailService.setTransport(null as any);
  });

  it('should send email via configured transport', async () => {
    const sendFn = vi.fn().mockResolvedValue(undefined);
    EmailService.setTransport(sendFn);

    await EmailService.send({
      to: 'guest@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(sendFn).toHaveBeenCalledWith({
      to: 'guest@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      from: 'noreply@sinaicamps.com',
    });
  });

  it('should use custom from address', async () => {
    const sendFn = vi.fn().mockResolvedValue(undefined);
    EmailService.setTransport(sendFn);

    await EmailService.send({
      to: 'guest@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      from: 'custom@sinaicamps.com',
    });

    expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({ from: 'custom@sinaicamps.com' }));
  });

  it('should log to console when no transport configured', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await EmailService.send({
      to: 'guest@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should use EMAIL_FROM env var when no from provided', async () => {
    vi.stubEnv('EMAIL_FROM', 'custom@example.com');
    const sendFn = vi.fn().mockResolvedValue(undefined);
    EmailService.setTransport(sendFn);

    await EmailService.send({
      to: 'guest@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({ from: 'custom@example.com' }));
    vi.unstubAllEnvs();
  });
});

describe('Email Templates', () => {
  it('bookingConfirmationTemplate should include booking details', () => {
    const html = bookingConfirmationTemplate({
      guestName: 'John',
      propertyName: 'Mountain Lodge',
      checkIn: '2026-01-01',
      checkOut: '2026-01-05',
      bookingId: 'book-123',
    });

    expect(html).toContain('John');
    expect(html).toContain('Mountain Lodge');
    expect(html).toContain('2026-01-01');
    expect(html).toContain('2026-01-05');
    expect(html).toContain('book-123');
  });

  it('paymentReceiptTemplate should include payment details', () => {
    const html = paymentReceiptTemplate({
      guestName: 'Jane',
      amount: '$250.00',
      paymentId: 'pay-456',
      date: '2026-01-02',
    });

    expect(html).toContain('Jane');
    expect(html).toContain('$250.00');
    expect(html).toContain('pay-456');
    expect(html).toContain('2026-01-02');
  });

  it('reviewRequestTemplate should include review link', () => {
    const html = reviewRequestTemplate({
      guestName: 'Bob',
      propertyName: 'Safari Camp',
      reviewLink: 'https://example.com/review/789',
    });

    expect(html).toContain('Bob');
    expect(html).toContain('Safari Camp');
    expect(html).toContain('https://example.com/review/789');
  });

  it('cancellationTemplate should include cancellation details', () => {
    const html = cancellationTemplate({
      guestName: 'Alice',
      propertyName: 'Beach Resort',
      checkIn: '2026-02-01',
      checkOut: '2026-02-05',
      reason: 'Weather concerns',
    });

    expect(html).toContain('Alice');
    expect(html).toContain('Beach Resort');
    expect(html).toContain('2026-02-01');
    expect(html).toContain('2026-02-05');
    expect(html).toContain('Weather concerns');
  });

  it('cancellationTemplate should omit reason when not provided', () => {
    const html = cancellationTemplate({
      guestName: 'Alice',
      propertyName: 'Beach Resort',
      checkIn: '2026-02-01',
      checkOut: '2026-02-05',
    });

    expect(html).toContain('Alice');
    expect(html).not.toContain('Reason');
  });

  it('newBookingNotificationTemplate should include booking details', () => {
    const html = newBookingNotificationTemplate({
      ownerName: 'Owner',
      guestName: 'Guest',
      propertyName: 'Camp',
      roomName: 'Luxury Tent',
      checkIn: '2026-03-01',
      checkOut: '2026-03-03',
      amount: '$300',
      manageUrl: 'https://example.com/manage',
    });

    expect(html).toContain('Owner');
    expect(html).toContain('Guest');
    expect(html).toContain('Camp');
    expect(html).toContain('Luxury Tent');
    expect(html).toContain('2026-03-01');
    expect(html).toContain('2026-03-03');
    expect(html).toContain('$300');
    expect(html).toContain('https://example.com/manage');
  });
});
