"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateReferenceToken, requireAdminWithMfa } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Assemble Solutions <onboarding@resend.dev>";

export async function createShareLinkAction(
  requestId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdminWithMfa();

  const recipientLabel = String(formData.get("recipientLabel") ?? "").trim() || null;
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim().toLowerCase() || null;
  const daysValid = Math.max(1, Math.min(90, Number(formData.get("daysValid") ?? 30) || 30));
  const sendEmail = formData.get("sendEmail") === "on";

  const request = await prisma.referenceRequest.findUnique({
    where: { id: requestId },
    include: { candidate: true, response: true },
  });
  if (!request || !request.response) {
    throw new Error("Reference not found or not yet completed.");
  }

  const token = generateReferenceToken();
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);

  await prisma.shareLink.create({
    data: {
      token,
      requestId,
      createdById: admin.id,
      recipientLabel,
      recipientEmail,
      expiresAt,
    },
  });

  if (sendEmail && recipientEmail) {
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const link = `${base}/share/${token}`;
    const subject = `Reference for ${request.candidate.fullName} — Assemble Solutions`;
    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; line-height: 1.5; max-width: 560px;">
        <h2 style="color:#0b3d5c;">Confidential reference shared</h2>
        <p>${admin.fullName} at Assemble Solutions has shared a reference for
        <strong>${escapeHtml(request.candidate.fullName)}</strong> with you.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#0b3d5c; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:600;">View reference</a>
        </p>
        <p style="color:#555; font-size:13px;">If the button doesn't work, copy this link:<br><a href="${link}">${link}</a></p>
        <p style="color:#555; font-size:12px;">This link expires on ${expiresAt.toLocaleDateString("en-AU")} and may be revoked by Assemble Solutions at any time. Please do not forward.</p>
      </div>
    `;
    try {
      await resend.emails.send({ from: FROM, to: recipientEmail, subject, html });
    } catch {
      // ignore — share link is still created and visible in the UI
    }
  }

  revalidatePath(`/admin/reference/${requestId}`);
}

export async function revokeShareLinkAction(shareLinkId: string, requestId: string): Promise<void> {
  await requireAdminWithMfa();
  await prisma.shareLink.update({
    where: { id: shareLinkId },
    data: { revokedAt: new Date() },
  });
  revalidatePath(`/admin/reference/${requestId}`);
}
