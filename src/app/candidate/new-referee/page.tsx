import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, generateReferenceToken } from "@/lib/auth";
import { newRefereeSchema } from "@/lib/validation";
import { sendRefereeInvite } from "@/lib/email";

async function addRefereeAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = newRefereeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    redirect(`/candidate/new-referee?error=${encodeURIComponent(msg)}`);
  }
  const data = parsed.data;

  const token = generateReferenceToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const created = await prisma.referenceRequest.create({
    data: {
      token,
      candidateId: user.id,
      status: "PENDING",
      expiresAt,
      positionAppliedFor: data.positionAppliedFor || null,
      refereeFullName: data.refereeFullName,
      refereeEmail: data.refereeEmail,
      refereeRelationship: data.refereeRelationship,
      refereeOrganisation: data.refereeOrganisation || null,
      refereePhone: data.refereePhone || null,
      candidateRoleTitle: data.candidateRoleTitle || null,
      workedTogetherFrom: data.workedTogetherFrom || null,
      workedTogetherTo: data.workedTogetherTo || null,
    },
  });

  try {
    await sendRefereeInvite({
      toEmail: data.refereeEmail,
      toName: data.refereeFullName,
      candidateName: user.fullName,
      token,
    });
    await prisma.referenceRequest.update({
      where: { id: created.id },
      data: { sentAt: new Date() },
    });
  } catch (e) {
    redirect(
      `/candidate/new-referee?error=${encodeURIComponent(
        "Referee saved but email failed to send. Contact Assemble Solutions."
      )}`
    );
  }

  redirect("/candidate?added=1");
}

export default async function NewRefereePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;

  return (
    <div className="card p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-brand">Add a referee</h1>
        <Link href="/candidate" className="btn-ghost">Back</Link>
      </div>
      <p className="text-sm text-slate-600 mb-6">
        We&rsquo;ll email a secure reference form to your referee with a link that&rsquo;s
        unique to them. The link expires in 30 days.
      </p>
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
      <form action={addRefereeAction} className="space-y-5">
        <fieldset>
          <legend className="section-title">Referee details</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="field">
              <label className="label" htmlFor="refereeFullName">Full name *</label>
              <input className="input" id="refereeFullName" name="refereeFullName" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="refereeEmail">Email *</label>
              <input className="input" id="refereeEmail" name="refereeEmail" type="email" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="refereeRelationship">Relationship to you *</label>
              <input className="input" id="refereeRelationship" name="refereeRelationship" placeholder="e.g. Direct manager" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="refereeOrganisation">Organisation</label>
              <input className="input" id="refereeOrganisation" name="refereeOrganisation" />
            </div>
            <div className="field">
              <label className="label" htmlFor="refereePhone">Phone</label>
              <input className="input" id="refereePhone" name="refereePhone" />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="section-title">Context for the referee</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="field">
              <label className="label" htmlFor="candidateRoleTitle">Your role when you worked with them</label>
              <input className="input" id="candidateRoleTitle" name="candidateRoleTitle" placeholder="e.g. Project Engineer" />
            </div>
            <div className="field">
              <label className="label" htmlFor="positionAppliedFor">Role you&rsquo;re being considered for</label>
              <input className="input" id="positionAppliedFor" name="positionAppliedFor" placeholder="e.g. Systems Engineer (Defence)" />
            </div>
            <div className="field">
              <label className="label" htmlFor="workedTogetherFrom">Worked together from</label>
              <input className="input" id="workedTogetherFrom" name="workedTogetherFrom" placeholder="e.g. Jan 2021" />
            </div>
            <div className="field">
              <label className="label" htmlFor="workedTogetherTo">Worked together to</label>
              <input className="input" id="workedTogetherTo" name="workedTogetherTo" placeholder="e.g. Present" />
            </div>
          </div>
        </fieldset>

        <button type="submit" className="btn-primary w-full">Send reference request</button>
      </form>
    </div>
  );
}
