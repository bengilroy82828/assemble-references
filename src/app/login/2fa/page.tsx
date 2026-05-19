import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, findMatchingBackupCode, getSession } from "@/lib/auth";
import { verifyTotpCode } from "@/lib/totp";

export const dynamic = "force-dynamic";

async function verifyAction(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/candidate");
  if (session.mfaVerified) redirect("/admin");

  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/login/2fa?error=" + encodeURIComponent("Enter a 6-digit code or backup code."));

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    await destroySession();
    redirect("/login?error=" + encodeURIComponent("2FA is not configured. Please sign in again."));
  }

  // Try TOTP first, then backup code
  let ok = verifyTotpCode(user.totpSecret, user.email, code);
  let usedBackupHash: string | null = null;
  if (!ok) {
    usedBackupHash = await findMatchingBackupCode(code, user.backupCodeHashes);
    ok = usedBackupHash !== null;
  }

  if (!ok) {
    redirect("/login/2fa?error=" + encodeURIComponent("Invalid code. Try again."));
  }

  if (usedBackupHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: { backupCodeHashes: user.backupCodeHashes.filter((h) => h !== usedBackupHash) },
    });
  }

  await createSession({ userId: user.id, role: user.role, email: user.email, mfaVerified: true });
  redirect("/admin");
}

export default async function TwoFactorChallenge({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/candidate");
  if (session.mfaVerified) redirect("/admin");

  const { error } = await searchParams;

  return (
    <div className="card p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-brand mb-2">Two-factor verification</h1>
      <p className="text-sm text-slate-600 mb-6">
        Enter the 6-digit code from your authenticator app, or use one of your
        backup codes.
      </p>
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
      <form action={verifyAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="code">Verification code</label>
          <input
            className="input text-lg tracking-widest text-center"
            id="code"
            name="code"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            required
            placeholder="123456"
          />
          <p className="help">Or a backup code (e.g. abcde-12345)</p>
        </div>
        <button type="submit" className="btn-primary w-full">Verify</button>
      </form>
    </div>
  );
}
