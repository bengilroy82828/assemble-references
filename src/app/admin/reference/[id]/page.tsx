import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminWithMfa } from "@/lib/auth";
import PrintButton from "./PrintButton";
import ShareLinkManager from "./ShareLinkManager";

export const dynamic = "force-dynamic";

export default async function ReferenceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminWithMfa();

  const { id } = await params;
  const req = await prisma.referenceRequest.findUnique({
    where: { id },
    include: {
      candidate: true,
      response: true,
      shareLinks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!req) notFound();
  const r = req.response;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin" className="btn-ghost">&larr; Back</Link>
        <div className="flex gap-2">
          {r && (
            <a href={`/admin/reference/${req.id}/pdf`} className="btn-secondary" target="_blank" rel="noopener">
              Download PDF
            </a>
          )}
          <PrintButton />
        </div>
      </div>

      <div className="card p-6">
        <p className="text-sm uppercase tracking-wide text-slate-500">Reference</p>
        <h1 className="text-2xl font-bold text-brand mb-2">{req.candidate.fullName}</h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Row label="Candidate email" value={req.candidate.email} />
          <Row label="Role being considered" value={req.positionAppliedFor ?? "—"} />
          <Row label="Status" value={req.status} />
          <Row label="Request sent" value={req.sentAt?.toLocaleString() ?? "—"} />
          <Row label="Submitted" value={req.completedAt?.toLocaleString() ?? "—"} />
        </div>
      </div>

      {!r ? (
        <div className="card p-6 text-slate-600">
          This reference has not yet been submitted by the referee.
        </div>
      ) : (
        <>
          <Card title="Referee">
            <Row label="Name" value={r.refereeFullName} />
            <Row label="Email" value={r.refereeEmail} />
            <Row label="Job title" value={r.refereeJobTitle ?? "—"} />
            <Row label="Organisation" value={r.refereeOrganisation ?? "—"} />
            <Row label="Phone" value={r.refereePhone ?? "—"} />
          </Card>

          <Card title="Relationship">
            <Row label="Relationship" value={r.relationship} />
            <LongRow label="Capacity in which they worked together" value={r.capacityKnown} />
            <Row label="Duration known" value={r.durationKnown} />
            <Row label="Contact frequency" value={r.contactFrequency} />
          </Card>

          <Card title="Role performance">
            <LongRow label="Roles and duties" value={r.rolesAndDuties} />
            <LongRow label="Strengths" value={r.strengths} />
            <LongRow label="Areas for improvement" value={r.areasForImprovement} />
            <LongRow label="Work quality" value={r.workQuality} />
            <LongRow label="Reliability" value={r.reliabilityComments} />
            <LongRow label="Teamwork" value={r.teamworkComments} />
            <LongRow label="Leadership" value={r.leadershipComments ?? "—"} />
            <LongRow label="Response to stress" value={r.stressResponseComments} />
          </Card>

          <Card title="Character & suitability">
            <LongRow label="Honesty & integrity" value={r.honestyIntegrity} />
            <LongRow label="Trustworthiness with sensitive info" value={r.trustworthiness} />
            <LongRow label="Discretion / confidentiality" value={r.discretionConfidentiality} />
            <LongRow label="Loyalty & allegiance" value={r.loyaltyAllegiance} />
            <LongRow label="Financial responsibility" value={r.financialResponsibility} />
            <LongRow label="Substance concerns" value={r.substanceConcerns} />
            <LongRow label="Legal / criminal concerns" value={r.legalConcerns} />
            <LongRow label="Foreign influence concerns" value={r.foreignInfluenceConcerns} />
            <LongRow label="Vulnerabilities / coercion risk" value={r.vulnerabilitiesConcerns} />
          </Card>

          <Card title="Overall">
            <LongRow label="Would re-engage" value={r.wouldRehire} />
            <LongRow label="Recommend for trusted role" value={r.recommendForTrustedRole} />
            <LongRow label="Additional comments" value={r.additionalComments ?? "—"} />
          </Card>

          <Card title="Declaration">
            <Row label="Declared information true" value={r.declarationTrue ? "Yes" : "No"} />
            <Row label="Consented to storage" value={r.declarationConsent ? "Yes" : "No"} />
            <Row label="Signed by" value={r.signedName} />
            <Row label="Submitted at" value={r.submittedAt.toLocaleString()} />
            <Row label="IP" value={r.submittedFromIp ?? "—"} />
          </Card>

          <div className="print:hidden">
            <ShareLinkManager
              requestId={req.id}
              candidateName={req.candidate.fullName}
              existingLinks={req.shareLinks.map((s) => ({
                id: s.id,
                token: s.token,
                createdAt: s.createdAt.toISOString(),
                expiresAt: s.expiresAt.toISOString(),
                revokedAt: s.revokedAt?.toISOString() ?? null,
                recipientLabel: s.recipientLabel,
                recipientEmail: s.recipientEmail,
                viewCount: s.viewCount,
                lastViewedAt: s.lastViewedAt?.toISOString() ?? null,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="section-title">{title}</h2>
      <div className="space-y-3 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-slate-500">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
}

function LongRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className="whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded p-3">{value}</div>
    </div>
  );
}
