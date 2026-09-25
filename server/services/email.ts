/**
 * Email Service — password-reset codes
 *
 * Uses plain SMTP via nodemailer, so it works with any provider: Resend,
 * Brevo, AWS SES, Mailgun, even Gmail — no vendor SDK, just SMTP_* env
 * vars. See .env.example / DEPLOYMENT.md for setup.
 *
 * If SMTP isn't configured (e.g. local dev before you've set it up), this
 * logs the code to the server console instead of throwing, so the reset
 * flow is still fully testable without a real mailbox.
 */
import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let warnedOnce = false;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !port || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  code: string,
  displayName: string
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    if (!warnedOnce) {
      console.warn(
        "[Email] SMTP not configured (SMTP_HOST/PORT/USER/PASSWORD) — " +
          "logging reset codes to console instead of sending email. See .env.example."
      );
      warnedOnce = true;
    }
    console.log(`[Email:DEV] Password reset code for ${toEmail}: ${code} (expires in 30 min)`);
    return;
  }

  const from = process.env.SMTP_FROM || "FastSewa <no-reply@fastsewa.app>";
  await t.sendMail({
    from,
    to: toEmail,
    subject: "FastSewa password reset code",
    text:
      `Hi ${displayName},\n\n` +
      `Your FastSewa password reset code is: ${code}\n\n` +
      `Enter this in the app to set a new password. It expires in 30 minutes.\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<p>Hi ${escapeHtml(displayName)},</p>` +
      `<p>Your FastSewa password reset code is:</p>` +
      `<p style="font-size:28px;font-weight:700;letter-spacing:4px">${escapeHtml(code)}</p>` +
      `<p>Enter this in the app to set a new password. It expires in 30 minutes.</p>` +
      `<p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}
