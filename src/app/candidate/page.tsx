import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CandidateDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");

  const requests = await prisma.referenceRequest.findMany({
    where: { candidateId: user.id },
    include: { response: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand">My referees</h1>
          <p className="text-slate-600 text-sm">Welcome, {user.fullName}.</p>
        </div>
        <Link href="/candidate/new-referee" className="btn-primary">+ Add referee</Link>
      </div>

      {requests.length === 0 ? (
        <div className="card p-8 text-center text-slate-600">
          <p className="mb-4">You haven&rsquo;t added any referees yet.</p>
          <Link href="/candidate/new-referee" className="btn-primary">Add your first referee</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Referee</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Relationship</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Sent</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{r.refereeFullName}</td>
                  <td className="px-4 py-2 text-slate-600">{r.refereeEmail}</td>
                  <td className="px-4 py-2 text-slate-600">{r.refereeRelationship}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {r.sentAt ? new Date(r.sentAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "COMPLETED" | "EXPIRED" }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    EXPIRED: "bg-slate-200 text-slate-700",
  };
  const label: Record<string, string> = {
    PENDING: "Awaiting referee",
    COMPLETED: "Completed",
    EXPIRED: "Expired",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  );
}
