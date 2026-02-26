// src/services/email/email.service.ts
import { Resend } from "resend";
import { getLogger } from "../../logger";

const log = getLogger("Email");

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.warn("RESEND_API_KEY not set — emails will not be sent");
    return null;
  }
  resend = new Resend(apiKey);
  return resend;
}

/**
 * Send a password reset email.
 * Never throws — logs errors internally to prevent email enumeration.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<void> {
  const client = getResend();
  if (!client) {
    log.warn({ to }, "Skipping password reset email — Resend not configured");
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "noreply@cygobet.com";

  try {
    await client.emails.send({
      from,
      to,
      subject: "Reset your CygoBet password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="font-size: 22px; margin-bottom: 16px;">Reset your password</h2>
          <p style="font-size: 15px; color: #333; line-height: 1.5;">
            We received a request to reset your CygoBet password.
            Click the button below to set a new password. This link expires in 15 minutes.
          </p>
          <a href="${resetLink}" style="display: inline-block; background: #007AFF; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; margin: 24px 0;">
            Reset Password
          </a>
          <p style="font-size: 13px; color: #999; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    log.info({ to }, "Password reset email sent");
  } catch (err) {
    log.error({ err, to }, "Failed to send password reset email");
  }
}
