import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "Assemble Solutions <onboarding@resend.dev>";

function appUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL must be set");
  return base;
}

export async function sendRefereeInvite(args: {
  toEmail: string;
  toName: string;
  candidateName: string;
  token: string;
}) {
  const link = `${appUrl()}/reference/${args.token}`;
  const subject = `Reference request for ${args.candidateName} — Assemble Solutions`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; line-height: 1.5; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0b3d5c; margin-bottom: 8px;">Reference request</h2>
      <p>Hi ${escapeHtml(args.toName)},</p>
      <p><strong>${escapeHtml(args.candidateName)}</strong> has nominated you as a referee
      for a defence-sector role they are being considered for through
      <strong>Assemble Solutions</strong>.</p>
      <p>The reference form should take 10&ndash;15 minutes. Your responses will be kept
      confidential and used only for the purpose of this candidate's assessment.</p>
      <p style="margin: 24px 0;">
        <a href="${link}"
           style="background:#0b3d5c; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:600;">
          Open reference form
        </a>
      </p>
      <p style="color:#555; font-size:13px;">If the button doesn't work, copy this link into your browser:<br>
        <a href="${link}">${link}</a>
      </p>
      <p style="color:#555; font-size:13px;">This link is unique to you and will expire in 30 days.</p>
      <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;">
      <p style="color:#777; font-size:12px;">Assemble Solutions &mdash; defence recruitment</p>
    </div>
  `;

  return resend.emails.send({
    from: FROM,
    to: args.toEmail,
    subject,
    html,
  });
}

export async function sendRefereeReminder(args: {
  toEmail: string;
  toName: string;
  candidateName: string;
  token: string;
  reminderNumber: number;
}) {
  const link = `${appUrl()}/reference/${args.token}`;
  const subject = `Reminder: reference request for ${args.candidateName}`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; line-height: 1.5; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0b3d5c; margin-bottom: 8px;">A quick reminder</h2>
      <p>Hi ${escapeHtml(args.toName)},</p>
      <p>This is a friendly reminder that <strong>${escapeHtml(args.candidateName)}</strong>
      has nominated you to provide a reference for a defence-sector role through
      <strong>Assemble Solutions</strong>.</p>
      <p>The form takes about 10&ndash;15 minutes. Your candidate is waiting on this
      reference to proceed with their application.</p>
      <p style="margin: 24px 0;">
        <a href="${link}"
           style="background:#0b3d5c; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:600;">
          Open reference form
        </a>
      </p>
      <p style="color:#555; font-size:13px;">If the button doesn't work, copy this link into your browser:<br>
        <a href="${link}">${link}</a>
      </p>
      <p style="color:#888; font-size:12px;">If you&rsquo;ve already completed this reference, please ignore this email.
      If you&rsquo;d prefer not to provide a reference, please let the candidate know.</p>
      <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;">
      <p style="color:#777; font-size:12px;">Assemble Solutions &mdash; defence recruitment</p>
    </div>
  `;

  return resend.emails.send({
    from: FROM,
    to: args.toEmail,
    subject,
    html,
  });
}

export async function sendCompletedReferenceNotification(args: {
  candidateName: string;
  candidateEmail: string;
  refereeName: string;
  refereeEmail: string;
  requestId: string;
}) {
  const adminRaw = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminRaw) return;
  const recipients = adminRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

  const link = `${appUrl()}/admin/reference/${args.requestId}`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; line-height: 1.5; max-width: 560px;">
      <h2 style="color:#0b3d5c;">Reference completed</h2>
      <p>A new reference has been submitted.</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding:4px 12px 4px 0; color:#555;">Candidate:</td><td><strong>${escapeHtml(args.candidateName)}</strong> (${escapeHtml(args.candidateEmail)})</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#555;">Referee:</td><td>${escapeHtml(args.refereeName)} (${escapeHtml(args.refereeEmail)})</td></tr>
      </table>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background:#0b3d5c; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none;">View reference</a>
      </p>
    </div>
  `;

  return resend.emails.send({
    from: FROM,
    to: recipients,
    subject: `Reference completed: ${args.candidateName} — by ${args.refereeName}`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
