import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SharedReferencePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const share = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      request: {
        include: { candidate: true, response: true },
      },
    },
  });
  if (!share) notFound();

  if (share.revokedAt) {
    return <Notice title="Link revoked" body="This share link has been revoked by Assemble Solutions. Please request a new one." />;
  }
  if (share.expiresAt < new Date()) {
    return <Notice title="Link expired" body="This share link has expired. Please request a new one from Assemble Solutions." />;
  }
  if (!share.request.response) {
    return <Notice title="Reference not yet submitted" body="The referee has not yet submitted this reference." />;
  }

  // Best-effort view tracking
  try {
    await prisma.shareLink.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    });
  } catch {}

  const r = share.request.response;
  const req = share.request;
  const candidate = share.request.candidate;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide font-semibold text-red-700">Confidential</p>
          <p className="text-xs text-slate-500">Shared by Assemble Solutions{share.recipientLabel ? ` with ${share.recipientLabel}` : ""}</p>
        </div>
        <h1 className="text-2xl font-bold text-brand mb-2">Reference for {candidate.fullName}</h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Row label="Role being considered" value={req.positionAppliedFor ?? "—"} />
          <Row label="Submitted" value={r.submittedAt.toLocaleString()} />
          <Row label="Link expires" value={share.expiresAt.toLocaleDateString()} />
        </div>
        <p className="text-xs text-slate-500 mt-4">
          This reference was prepared in confidence for the assessment of this
          candidate. Please do not redistribute.
        </p>
      </div>

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

      <Card title="Overall recommendation">
        <LongRow label="Would re-engage" value={r.wouldRehire} />
        <LongRow label="Recommend for trusted role" value={r.recommendForTrustedRole} />
        <LongRow label="Additional comments" value={r.additionalComments ?? "—"} />
      </Card>

      <Card title="Declaration">
        <Row label="Information declared true" value={r.declarationTrue ? "Yes" : "No"} />
        <Row label="Consent to storage & sharing" value={r.declarationConsent ? "Yes" : "No"} />
        <Row label="Signed by" value={r.signedName} />
        <Row label="Submitted at" value={r.submittedAt.toLocaleString()} />
      </Card>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-8 max-w-2xl mx-auto text-center">
      <h1 className="text-xl font-bold text-brand mb-2">{title}</h1>
      <p className="text-slate-600">{body}</p>
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
