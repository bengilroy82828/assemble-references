import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, getSession } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";

async function signupAction(formData: FormData) {
  "use server";
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    redirect(`/signup?error=${encodeURIComponent(msg)}`);
  }
  const { fullName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("An account already exists with that email.")}`);
  }

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash: await hashPassword(password),
      role: "CANDIDATE",
    },
  });
  await createSession({ userId: user.id, role: user.role, email: user.email, mfaVerified: true });
  redirect("/candidate");
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/candidate");
  const { error } = await searchParams;

  return (
    <div className="card p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-brand">Create your candidate account</h1>
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
      <form action={signupAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input className="input" id="fullName" name="fullName" required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          <p className="help">Minimum 8 characters.</p>
        </div>
        <button type="submit" className="btn-primary w-full">Create account</button>
      </form>
      <p className="text-sm text-slate-600 mt-4">
        Already have an account? <Link href="/login" className="text-brand underline">Sign in</Link>
      </p>
    </div>
  );
}
