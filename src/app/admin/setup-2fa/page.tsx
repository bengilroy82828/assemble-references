import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  generateBackupCodes,
  getSession,
} from "@/lib/auth";
import { newTotpSecret, totpQrDataUrl, verifyTotpCode } from "@/lib/totp";

export const dynamic = "force-dynamic";

async function activateAction(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/candidate");

  const code = String(formData.get("code") ?? "").trim();

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    await destroySession();
    redirect("/login");
  }
  if (user.totpEnabled) redirect("/admin");
  if (!user.totpSecret) {
    redirect("/admin/setup-2fa?error=" + encodeURIComponent("Setup expired. Please refresh and try again."));
  }

  if (!verifyTotpCode(user.totpSecret, user.email, code)) {
    redirect(
      "/admin/setup-2fa?error=" +
        encodeURIComponent("That code didn't match. Make sure your device clock is correct, then try again.")
    );
  }

  const { plain, hashes } = await generateBackupCodes(8);

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, backupCodeHashes: hashes },
  });

  await createSession({ userId: user.id, role: user.role, email: user.email, mfaVerified: true });
  redirect(`/admin/setup-2fa/backup-codes?codes=${encodeURIComponent(plain.join(","))}`);
}

export default async function Setup2FAPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/candidate");

  let user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    await destroySession();
    redirect("/login");
  }
  if (user.totpEnabled) redirect("/admin");

  // Persist the staged secret on the user row so it's stable across page
  // reloads (and across failed verification attempts) until 2FA is activated.
  if (!user.totpSecret) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: newTotpSecret() },
    });
  }

  const qr = await totpQrDataUrl(user.totpSecret!, user.email);
  const { error } = await searchParams;

  return (
    <div className="card p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-brand mb-2">Set up two-factor authentication</h1>
      <p className="text-sm text-slate-600 mb-6">
        Admin accounts must use 2FA. Install an authenticator app on your phone
        (Google Authenticator, Microsoft Authenticator, 1Password, or Authy),
        then scan the QR code below.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded p-6 mb-6 flex flex-col md:flex-row gap-6 items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Authenticator setup QR code" className="w-56 h-56 bg-white p-2 rounded border" />
        <div className="flex-1 text-sm">
          <p className="text-slate-700 mb-2">Or enter this secret manually:</p>
          <code className="block bg-white border border-slate-200 rounded p-2 text-xs font-mono break-all select-all">
            {user.totpSecret}
          </code>
          <p className="help mt-2">Account name: {user.email}</p>
          <p className="help">Type: Time-based (TOTP), 6 digits, 30-second interval</p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

      <form action={activateAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="code">Enter the 6-digit code from your app to confirm</label>
          <input
            className="input text-lg tracking-widest text-center"
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="123456"
          />
        </div>
        <button type="submit" className="btn-primary w-full">Activate 2FA</button>
      </form>
    </div>
  );
}
