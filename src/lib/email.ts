import { logger } from './logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * EmailService
 * ────────────
 * Pluggable email sender. In development, emails are logged to console.
 * In production, configure SMTP or a transactional email provider (e.g. Resend, SendGrid).
 */
export class EmailService {
  private static transport: ((opts: EmailOptions) => Promise<void>) | null = null;

  /**
   * Set a custom transport (e.g. Resend, Nodemailer, SendGrid).
   */
  static setTransport(fn: (opts: EmailOptions) => Promise<void>): void {
    this.transport = fn;
  }

  /**
   * Send an email. Falls back to console logging if no transport is configured.
   */
  static async send(opts: EmailOptions): Promise<void> {
    const from = opts.from || process.env.EMAIL_FROM || 'noreply@sinaicamps.com';

    if (this.transport) {
      await this.transport({ ...opts, from });
      return;
    }

    // Development fallback — log to console
    logger.info('── EMAIL ──────────────────────────────');
    logger.info(`To:      ${opts.to}`);
    logger.info(`From:    ${from}`);
    logger.info(`Subject: ${opts.subject}`);
    logger.info('Body:');
    logger.info(opts.html);
    logger.info('────────────────────────────────────────');
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export function bookingConfirmationTemplate(data: {
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}): string {
  return `
    <h1>Booking Confirmed — ${data.propertyName}</h1>
    <p>Hi ${data.guestName},</p>
    <p>Your booking at <strong>${data.propertyName}</strong> has been confirmed.</p>
    <ul>
      <li><strong>Check-in:</strong> ${data.checkIn}</li>
      <li><strong>Check-out:</strong> ${data.checkOut}</li>
      <li><strong>Booking ID:</strong> ${data.bookingId}</li>
    </ul>
    <p>We look forward to hosting you!</p>
  `;
}

export function paymentReceiptTemplate(data: {
  guestName: string;
  amount: string;
  paymentId: string;
  date: string;
}): string {
  return `
    <h1>Payment Receipt</h1>
    <p>Hi ${data.guestName},</p>
    <p>We've received your payment of <strong>${data.amount}</strong>.</p>
    <ul>
      <li><strong>Payment ID:</strong> ${data.paymentId}</li>
      <li><strong>Date:</strong> ${data.date}</li>
    </ul>
    <p>Thank you for your business!</p>
  `;
}

export function reviewRequestTemplate(data: {
  guestName: string;
  propertyName: string;
  reviewLink: string;
}): string {
  return `
    <h1>How was your stay at ${data.propertyName}?</h1>
    <p>Hi ${data.guestName},</p>
    <p>We hope you enjoyed your stay. We'd love to hear your feedback!</p>
    <p><a href="${data.reviewLink}">Leave a review</a></p>
    <p>Thank you for choosing ${data.propertyName}.</p>
  `;
}
