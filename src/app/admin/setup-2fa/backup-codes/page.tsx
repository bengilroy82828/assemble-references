import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BackupCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ codes?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" || !session.mfaVerified) redirect("/admin");

  const { codes } = await searchParams;
  if (!codes) redirect("/admin");
  const list = decodeURIComponent(codes).split(",").filter(Boolean);

  return (
    <div className="card p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-brand mb-2">Save your backup codes</h1>
      <p className="text-sm text-slate-600 mb-4">
        Store these in a safe place (password manager, printed copy). Each code
        can be used <strong>once</strong> if you lose access to your authenticator app.
        We won&rsquo;t show them again.
      </p>
      <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-6 font-mono text-sm grid grid-cols-2 gap-2 select-all">
        {list.map((c) => (
          <div key={c} className="bg-white border border-slate-200 rounded px-3 py-2 text-center tracking-wider">{c}</div>
        ))}
      </div>
      <Link href="/admin" className="btn-primary w-full text-center block">I&rsquo;ve saved them — continue</Link>
    </div>
  );
}
