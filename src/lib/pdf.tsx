import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReferenceRequest, ReferenceResponse, User } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.4, color: "#111" },
  header: { borderBottom: "2 solid #0b3d5c", paddingBottom: 8, marginBottom: 16 },
  brand: { color: "#0b3d5c", fontSize: 14, fontWeight: 700 },
  title: { fontSize: 18, fontWeight: 700, marginTop: 4 },
  subtitle: { color: "#555", fontSize: 10, marginTop: 2 },
  sectionTitle: {
    backgroundColor: "#0b3d5c",
    color: "#fff",
    padding: "4 8",
    fontSize: 11,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
  },
  rowLabel: { color: "#666", marginBottom: 2, fontSize: 9, textTransform: "uppercase" },
  rowValue: { marginBottom: 8 },
  twoCol: { flexDirection: "row", gap: 16, marginBottom: 4 },
  twoColCell: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
    borderTop: "1 solid #eee",
    paddingTop: 6,
  },
  confidential: {
    fontSize: 8,
    color: "#a00",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View wrap={false}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );
}

function TwoFields({ a, b }: { a: { label: string; value: string }; b: { label: string; value: string } }) {
  return (
    <View style={styles.twoCol}>
      <View style={styles.twoColCell}>
        <Text style={styles.rowLabel}>{a.label}</Text>
        <Text style={styles.rowValue}>{a.value || "—"}</Text>
      </View>
      <View style={styles.twoColCell}>
        <Text style={styles.rowLabel}>{b.label}</Text>
        <Text style={styles.rowValue}>{b.value || "—"}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

type Data = {
  request: ReferenceRequest;
  response: ReferenceResponse;
  candidate: User;
};

function ReferenceDocument({ request, response, candidate }: Data) {
  return (
    <Document title={`Reference — ${candidate.fullName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.confidential}>Confidential</Text>
          <Text style={styles.brand}>Assemble Solutions</Text>
          <Text style={styles.title}>Reference for {candidate.fullName}</Text>
          <Text style={styles.subtitle}>
            Submitted {response.submittedAt.toLocaleString("en-AU")} by {response.refereeFullName}
          </Text>
        </View>

        <Section title="Candidate">
          <TwoFields
            a={{ label: "Name", value: candidate.fullName }}
            b={{ label: "Email", value: candidate.email }}
          />
          <Field label="Role being considered" value={request.positionAppliedFor ?? ""} />
        </Section>

        <Section title="Referee">
          <TwoFields a={{ label: "Name", value: response.refereeFullName }} b={{ label: "Email", value: response.refereeEmail }} />
          <TwoFields a={{ label: "Job title", value: response.refereeJobTitle ?? "" }} b={{ label: "Organisation", value: response.refereeOrganisation ?? "" }} />
          <Field label="Phone" value={response.refereePhone ?? ""} />
        </Section>

        <Section title="Relationship">
          <TwoFields a={{ label: "Relationship", value: response.relationship }} b={{ label: "Duration known", value: response.durationKnown }} />
          <Field label="Capacity in which they worked together" value={response.capacityKnown} />
          <Field label="Contact frequency" value={response.contactFrequency} />
        </Section>

        <Section title="Role performance">
          <Field label="Roles and duties" value={response.rolesAndDuties} />
          <Field label="Strengths" value={response.strengths} />
          <Field label="Areas for improvement" value={response.areasForImprovement} />
          <Field label="Work quality" value={response.workQuality} />
          <Field label="Reliability" value={response.reliabilityComments} />
          <Field label="Teamwork" value={response.teamworkComments} />
          <Field label="Leadership" value={response.leadershipComments ?? ""} />
          <Field label="Response to stress" value={response.stressResponseComments} />
        </Section>

        <Section title="Character & suitability (defence context)">
          <Field label="Honesty & integrity" value={response.honestyIntegrity} />
          <Field label="Trustworthiness with sensitive info" value={response.trustworthiness} />
          <Field label="Discretion / confidentiality" value={response.discretionConfidentiality} />
          <Field label="Loyalty & allegiance" value={response.loyaltyAllegiance} />
          <Field label="Financial responsibility" value={response.financialResponsibility} />
          <Field label="Substance concerns" value={response.substanceConcerns} />
          <Field label="Legal / criminal concerns" value={response.legalConcerns} />
          <Field label="Foreign influence concerns" value={response.foreignInfluenceConcerns} />
          <Field label="Vulnerabilities / coercion risk" value={response.vulnerabilitiesConcerns} />
        </Section>

        <Section title="Overall">
          <Field label="Would re-engage" value={response.wouldRehire} />
          <Field label="Recommend for trusted role" value={response.recommendForTrustedRole} />
          <Field label="Additional comments" value={response.additionalComments ?? ""} />
        </Section>

        <Section title="Declaration">
          <TwoFields
            a={{ label: "Information declared true", value: response.declarationTrue ? "Yes" : "No" }}
            b={{ label: "Consent to storage & sharing", value: response.declarationConsent ? "Yes" : "No" }}
          />
          <TwoFields
            a={{ label: "Signed by (typed name)", value: response.signedName }}
            b={{ label: "Submitted at", value: response.submittedAt.toLocaleString("en-AU") }}
          />
        </Section>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Confidential — Assemble Solutions reference for ${candidate.fullName} — Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export async function renderReferencePdf(data: Data): Promise<Buffer> {
  return renderToBuffer(<ReferenceDocument {...data} />);
}
