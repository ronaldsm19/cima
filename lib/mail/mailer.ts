import "server-only";
import nodemailer from "nodemailer";

/**
 * Outgoing mail over SMTP (the office uses a Gmail account with an app
 * password). Sending is best-effort: a mail failure must never roll back the
 * business action that triggered it, so callers get a boolean, not a throw.
 * Disabled entirely unless EMAIL_ENABLED=true and the credentials are present.
 */

function transporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export function mailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true" && transporter() !== null;
}

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text body; wrapped in the shared HTML shell for the rich part. */
  text: string;
  heading?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export async function sendMail(msg: MailMessage): Promise<boolean> {
  if (!mailEnabled()) return false;
  const tx = transporter();
  if (!tx) return false;
  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: renderHtml(msg),
    });
    return true;
  } catch (error) {
    console.error("[mail] no se pudo enviar:", error);
    return false;
  }
}

/** Minimal branded shell — inline styles only (mail clients strip <style>). */
function renderHtml(msg: MailMessage): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = escape(msg.text).replace(/\n/g, "<br>");
  const action =
    msg.actionUrl && msg.actionLabel
      ? `<p style="margin:22px 0 0"><a href="${msg.actionUrl}" style="display:inline-block;background:#0E6B4E;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px">${escape(msg.actionLabel)}</a></p>`
      : "";

  return `<!doctype html><html lang="es"><body style="margin:0;background:#F4F6F3;padding:24px;font-family:'Plus Jakarta Sans',-apple-system,Segoe UI,sans-serif;color:#131A17">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #E6EAE4;border-radius:14px;padding:24px">
    <div style="font-size:13.5px;font-weight:700;color:#0E6B4E">Morales &amp; Asoc.</div>
    <div style="font-size:11.5px;color:#8A938C;margin-top:2px">Topografía · CFIA IC-4482</div>
    <h1 style="font-size:17px;font-weight:700;letter-spacing:-0.02em;margin:18px 0 8px">${escape(msg.heading ?? msg.subject)}</h1>
    <p style="font-size:13.5px;line-height:1.55;color:#2C3A33;margin:0">${body}</p>
    ${action}
    <p style="font-size:11.5px;color:#A5AEA7;margin:22px 0 0;border-top:1px solid #EEF1EC;padding-top:14px">
      Aviso automático del sistema interno. No hace falta responder este correo.
    </p>
  </div>
</body></html>`;
}

/** Absolute URL for links inside emails (Vercel sets VERCEL_PROJECT_PRODUCTION_URL). */
export function appUrl(path: string): string {
  const base =
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return `${base}${path}`;
}
