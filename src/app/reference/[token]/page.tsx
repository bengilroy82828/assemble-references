import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { referenceResponseSchema } from "@/lib/validation";
import { sendCompletedReferenceNotification } from "@/lib/email";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function submitReferenceAction(token: string, formData: FormData) {
  "use server";

  const request = await prisma.referenceRequest.findUnique({
    where: { token },
    include: { candidate: true, response: true },
  });
  if (!request) notFound();
  if (request.response) {
    redirect(`/reference/${token}/submitted`);
  }
  if (request.status === "EXPIRED" || request.expiresAt < new Date()) {
    redirect(`/reference/${token}?error=${encodeURIComponent("This reference link has expired. Please contact Assemble Solutions.")}`);
  }

  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  // Checkboxes come through only when ticked; coerce to real booleans
  obj.declarationTrue = formData.get("declarationTrue") === "on";
  obj.declarationConsent = formData.get("declarationConsent") === "on";

  const parsed = referenceResponseSchema.safeParse(obj);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    redirect(`/reference/${token}?error=${encodeURIComponent(msg)}`);
  }
  const data = parsed.data;

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await prisma.$transaction([
    prisma.referenceResponse.create({
      data: {
        requestId: request.id,
        refereeFullName: data.refereeFullName,
        refereeEmail: data.refereeEmail,
        refereeJobTitle: data.refereeJobTitle || null,
        refereeOrganisation: data.refereeOrganisation || null,
        refereePhone: data.refereePhone || null,
        relationship: data.relationship,
        capacityKnown: data.capacityKnown,
        durationKnown: data.durationKnown,
        contactFrequency: data.contactFrequency,
        rolesAndDuties: data.rolesAndDuties,
        strengths: data.strengths,
        areasForImprovement: data.areasForImprovement,
        workQuality: data.workQuality,
        reliabilityComments: data.reliabilityComments,
        teamworkComments: data.teamworkComments,
        leadershipComments: data.leadershipComments || null,
        stressResponseComments: data.stressResponseComments,
        honestyIntegrity: data.honestyIntegrity,
        trustworthiness: data.trustworthiness,
        discretionConfidentiality: data.discretionConfidentiality,
        loyaltyAllegiance: data.loyaltyAllegiance,
        financialResponsibility: data.financialResponsibility,
        substanceConcerns: data.substanceConcerns,
        legalConcerns: data.legalConcerns,
        foreignInfluenceConcerns: data.foreignInfluenceConcerns,
        vulnerabilitiesConcerns: data.vulnerabilitiesConcerns,
        wouldRehire: data.wouldRehire,
        recommendForTrustedRole: data.recommendForTrustedRole,
        additionalComments: data.additionalComments || null,
        declarationTrue: data.declarationTrue,
        declarationConsent: data.declarationConsent,
        signedName: data.signedName,
        submittedFromIp: ip,
      },
    }),
    prisma.referenceRequest.update({
      where: { id: request.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    }),
  ]);

  try {
    await sendCompletedReferenceNotification({
      candidateName: request.candidate.fullName,
      candidateEmail: request.candidate.email,
      refereeName: data.refereeFullName,
      refereeEmail: data.refereeEmail,
      requestId: request.id,
    });
  } catch {
    // Notification is best-effort. Submission is still recorded.
  }

  redirect(`/reference/${token}/submitted`);
}

export default async function RefereeFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const request = await prisma.referenceRequest.findUnique({
    where: { token },
    include: { candidate: true, response: true },
  });
  if (!request) notFound();

  if (request.response) {
    return (
      <div className="card p-8 max-w-2xl mx-auto text-center">
        <h1 className="text-xl font-bold text-brand mb-2">This reference has already been submitted</h1>
        <p className="text-slate-600">Thank you. There&rsquo;s no further action required.</p>
      </div>
    );
  }

  if (request.expiresAt < new Date()) {
    return (
      <div className="card p-8 max-w-2xl mx-auto text-center">
        <h1 className="text-xl font-bold text-red-700 mb-2">This link has expired</h1>
        <p className="text-slate-600">Please contact Assemble Solutions for a new reference link.</p>
      </div>
    );
  }

  const submit = submitReferenceAction.bind(null, token);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8 mb-6">
        <p className="text-sm uppercase tracking-wide text-slate-500 mb-1">Reference request</p>
        <h1 className="text-2xl font-bold text-brand mb-2">
          Confidential reference for {request.candidate.fullName}
        </h1>
        <p className="text-slate-700 mb-4">
          You have been nominated by <strong>{request.candidate.fullName}</strong> as a
          referee for a defence-sector role they are being considered for through{" "}
          <strong>Assemble Solutions</strong>.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm space-y-1">
          {request.positionAppliedFor && (
            <p><span className="text-slate-500">Role being considered:</span> <strong>{request.positionAppliedFor}</strong></p>
          )}
          {request.candidateRoleTitle && (
            <p><span className="text-slate-500">Candidate&rsquo;s role when you worked together:</span> {request.candidateRoleTitle}</p>
          )}
          {(request.workedTogetherFrom || request.workedTogetherTo) && (
            <p><span className="text-slate-500">Period:</span> {request.workedTogetherFrom ?? "?"} &mdash; {request.workedTogetherTo ?? "?"}</p>
          )}
          {request.refereeRelationship && (
            <p><span className="text-slate-500">Stated relationship:</span> {request.refereeRelationship}</p>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Your responses are confidential and will only be shared with Assemble
          Solutions and the hiring organisation as part of this candidate&rsquo;s
          assessment. This form does <strong>not</strong> ask for security
          clearance numbers or any classified information.
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </p>
      )}

      <form action={submit} className="space-y-6">
        <Section title="Your details">
          <Grid>
            <Field label="Your full name *" name="refereeFullName" defaultValue={request.refereeFullName} required />
            <Field label="Email *" name="refereeEmail" type="email" defaultValue={request.refereeEmail} required />
            <Field label="Job title" name="refereeJobTitle" />
            <Field label="Organisation" name="refereeOrganisation" defaultValue={request.refereeOrganisation ?? ""} />
            <Field label="Phone" name="refereePhone" defaultValue={request.refereePhone ?? ""} />
          </Grid>
        </Section>

        <Section title="Relationship to candidate">
          <Field label="In what relationship do you know the candidate? *" name="relationship" defaultValue={request.refereeRelationship} required help="e.g. Direct manager, peer, client, supervisor of supervisor" />
          <TextArea label="In what capacity have you worked with the candidate? *" name="capacityKnown" required help="Briefly describe the working context (project, team, reporting line)" />
          <Grid>
            <Field label="How long have you known the candidate? *" name="durationKnown" required help="e.g. 3 years" />
            <Field label="How frequently were you in contact during that time? *" name="contactFrequency" required help="e.g. Daily, weekly, monthly" />
          </Grid>
        </Section>

        <Section title="Role performance">
          <TextArea label="What were the candidate's main roles and duties? *" name="rolesAndDuties" required />
          <TextArea label="What are the candidate's key strengths? *" name="strengths" required />
          <TextArea label="What areas could the candidate develop or improve? *" name="areasForImprovement" required />
          <TextArea label="How would you describe the quality of their work? *" name="workQuality" required />
          <TextArea label="How reliable, punctual and dependable is the candidate? *" name="reliabilityComments" required />
          <TextArea label="How does the candidate work with others (teamwork, communication)? *" name="teamworkComments" required />
          <TextArea label="Have you observed the candidate in a leadership or supervisory role?" name="leadershipComments" help="Optional — leave blank if not applicable" />
          <TextArea label="How does the candidate respond to pressure, stress or setbacks? *" name="stressResponseComments" required />
        </Section>

        <Section title="Character & suitability (defence context)">
          <p className="text-xs text-slate-500 mb-3">
            The following questions help assess the candidate&rsquo;s suitability for
            roles requiring trust and discretion. Please answer honestly — &ldquo;no
            concerns&rdquo; is a valid answer. Do <strong>not</strong> include any
            security clearance numbers or classified information.
          </p>
          <TextArea label="Honesty and integrity — your observations *" name="honestyIntegrity" required />
          <TextArea label="Trustworthiness in handling sensitive information *" name="trustworthiness" required />
          <TextArea label="Discretion and ability to maintain confidentiality *" name="discretionConfidentiality" required />
          <TextArea label="Loyalty and allegiance (to employer / Australia) — any observations? *" name="loyaltyAllegiance" required />
          <TextArea label="Financial responsibility — any concerns observed? *" name="financialResponsibility" required help='Reply "No concerns" if applicable' />
          <TextArea label="Substance use — any concerns regarding alcohol or drugs? *" name="substanceConcerns" required help='Reply "No concerns" if applicable' />
          <TextArea label="Any known criminal or police involvement? *" name="legalConcerns" required help='Reply "No, none known" if applicable' />
          <TextArea label="Any concerns about foreign contacts, allegiances, or undue foreign influence? *" name="foreignInfluenceConcerns" required help='Reply "No concerns" if applicable' />
          <TextArea label="Any factors (personal, financial, behavioural) that could leave the candidate open to pressure or coercion? *" name="vulnerabilitiesConcerns" required help='Reply "No concerns" if applicable' />
        </Section>

        <Section title="Overall recommendation">
          <TextArea label="Would you re-employ or re-engage the candidate? Why or why not? *" name="wouldRehire" required />
          <TextArea label="Would you recommend the candidate for a role requiring high levels of trust and discretion? *" name="recommendForTrustedRole" required />
          <TextArea label="Any additional comments?" name="additionalComments" />
        </Section>

        <Section title="Declaration">
          <label className="flex items-start gap-2 text-sm mb-3">
            <input type="checkbox" name="declarationTrue" className="mt-1" />
            <span>I declare that the information I have provided is true and accurate to the best of my knowledge.</span>
          </label>
          <label className="flex items-start gap-2 text-sm mb-3">
            <input type="checkbox" name="declarationConsent" className="mt-1" />
            <span>I consent to Assemble Solutions storing my responses and sharing them with the prospective employer for the purpose of this candidate&rsquo;s assessment.</span>
          </label>
          <Field label="Type your full name as signature *" name="signedName" required />
        </Section>

        <button type="submit" className="btn-primary w-full text-base py-3">Submit reference</button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="section-title">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  help,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  help?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
      {help && <p className="help">{help}</p>}
    </div>
  );
}

function TextArea({
  label,
  name,
  required,
  help,
}: {
  label: string;
  name: string;
  required?: boolean;
  help?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={name}>{label}</label>
      <textarea className="textarea" id={name} name={name} required={required} />
      {help && <p className="help">{help}</p>}
    </div>
  );
}
