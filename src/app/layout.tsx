import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Assemble Solutions — References",
  description: "Reference checks for defence candidates",
};

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-bold text-brand text-lg">
              Assemble Solutions <span className="font-normal text-slate-500">— References</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              {session ? (
                <>
                  {session.role === "ADMIN" && (
                    <Link href="/admin" className="text-slate-700 hover:text-brand">Admin</Link>
                  )}
                  <Link href="/candidate" className="text-slate-700 hover:text-brand">My referees</Link>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">{session.email}</span>
                  <form action={logoutAction}>
                    <button className="btn-ghost" type="submit">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost">Sign in</Link>
                  <Link href="/signup" className="btn-primary">Sign up</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="text-center text-xs text-slate-500 py-8">
          &copy; {new Date().getFullYear()} Assemble Solutions
        </footer>
      </body>
    </html>
  );
}
