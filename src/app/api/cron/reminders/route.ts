import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRefereeReminder } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const MAX_REMINDERS = 3;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // 1. Expire any PENDING requests past their expiry
  const expired = await prisma.referenceRequest.updateMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  // 2. Find PENDING requests due for a reminder.
  // Eligible when:
  //  - sentAt is at least REMINDER_INTERVAL_MS old
  //  - reminderCount < MAX_REMINDERS
  //  - lastReminderSentAt is null OR at least REMINDER_INTERVAL_MS old
  const cutoff = new Date(now.getTime() - REMINDER_INTERVAL_MS);
  const due = await prisma.referenceRequest.findMany({
    where: {
      status: "PENDING",
      sentAt: { not: null, lte: cutoff },
      reminderCount: { lt: MAX_REMINDERS },
      OR: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { lte: cutoff } },
      ],
      expiresAt: { gt: now },
    },
    include: { candidate: true },
    take: 50, // safety cap per run
  });

  const results: Array<{ id: string; refereeEmail: string; ok: boolean; error?: string }> = [];

  for (const r of due) {
    try {
      await sendRefereeReminder({
        toEmail: r.refereeEmail,
        toName: r.refereeFullName,
        candidateName: r.candidate.fullName,
        token: r.token,
        reminderNumber: r.reminderCount + 1,
      });
      await prisma.referenceRequest.update({
        where: { id: r.id },
        data: {
          lastReminderSentAt: now,
          reminderCount: { increment: 1 },
        },
      });
      results.push({ id: r.id, refereeEmail: r.refereeEmail, ok: true });
    } catch (e) {
      results.push({
        id: r.id,
        refereeEmail: r.refereeEmail,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    expired: expired.count,
    remindersSent: results.filter((r) => r.ok).length,
    remindersFailed: results.filter((r) => !r.ok).length,
    results,
  });
}
