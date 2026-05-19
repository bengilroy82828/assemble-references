import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/candidate");
  }
  return (
    <div className="card p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-brand mb-2">Reference checks for defence candidates</h1>
      <p className="text-slate-600 mb-6">
        Add your referees, and we&rsquo;ll email each of them a secure form. Once they
        submit their reference, Assemble Solutions is notified and the reference is
        stored against your profile.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="btn-primary">Create candidate account</Link>
        <Link href="/login" className="btn-secondary">Sign in</Link>
      </div>
    </div>
  );
}
