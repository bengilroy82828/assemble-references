import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { createSession, getSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

async function loginAction(formData: FormData) {
  "use server";
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Please enter your email and password.")}`);
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=${encodeURIComponent("Email or password is incorrect.")}`);
  }

  if (user.role === "ADMIN") {
    if (!user.totpEnabled) {
      // First-time admin login → must set up 2FA before doing anything.
      await createSession({ userId: user.id, role: user.role, email: user.email, mfaVerified: false });
      redirect("/admin/setup-2fa");
    }
    // Existing admin → require TOTP challenge before granting MFA.
    await createSession({ userId: user.id, role: user.role, email: user.email, mfaVerified: false });
    redirect("/login/2fa");
  }

  await createSession({ userId: user.id, role: user.role, email: user.email, mfaVerified: true });
  redirect("/candidate");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    if (session.role === "ADMIN") {
      redirect(session.mfaVerified ? "/admin" : "/login/2fa");
    }
    redirect("/candidate");
  }
  const { error } = await searchParams;

  return (
    <div className="card p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-brand">Sign in</h1>
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
      <form action={loginAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button type="submit" className="btn-primary w-full">Sign in</button>
      </form>
      <p className="text-sm text-slate-600 mt-4">
        New here? <Link href="/signup" className="text-brand underline">Create an account</Link>
      </p>
    </div>
  );
}
