import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminWithMfa } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdminWithMfa();

  const requests = await prisma.referenceRequest.findMany({
    include: { candidate: true, response: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const completed = requests.filter((r) => r.status === "COMPLETED").length;
  const pending = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand">Admin dashboard</h1>
        <p className="text-slate-600 text-sm">All reference requests across all candidates.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total requests" value={requests.length} />
        <Stat label="Completed" value={completed} accent="text-green-700" />
        <Stat label="Awaiting referee" value={pending} accent="text-yellow-700" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Candidate</th>
              <th className="px-4 py-2">Referee</th>
              <th className="px-4 py-2">Relationship</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No reference requests yet.</td></tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <div className="font-medium">{r.candidate.fullName}</div>
                  <div className="text-xs text-slate-500">{r.candidate.email}</div>
                </td>
                <td className="px-4 py-2">
                  <div>{r.refereeFullName}</div>
                  <div className="text-xs text-slate-500">{r.refereeEmail}</div>
                </td>
                <td className="px-4 py-2 text-slate-600">{r.refereeRelationship}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.response && (
                    <Link href={`/admin/reference/${r.id}`} className="text-brand underline">View</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent ?? "text-brand"}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "COMPLETED" | "EXPIRED" }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    EXPIRED: "bg-slate-200 text-slate-700",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
