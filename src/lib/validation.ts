import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const newRefereeSchema = z.object({
  refereeFullName: z.string().trim().min(2),
  refereeEmail: z.string().trim().toLowerCase().email(),
  refereeRelationship: z.string().trim().min(2),
  refereeOrganisation: z.string().trim().optional().or(z.literal("")),
  refereePhone: z.string().trim().optional().or(z.literal("")),
  candidateRoleTitle: z.string().trim().optional().or(z.literal("")),
  positionAppliedFor: z.string().trim().optional().or(z.literal("")),
  workedTogetherFrom: z.string().trim().optional().or(z.literal("")),
  workedTogetherTo: z.string().trim().optional().or(z.literal("")),
});

export const referenceResponseSchema = z.object({
  refereeFullName: z.string().trim().min(2),
  refereeEmail: z.string().trim().toLowerCase().email(),
  refereeJobTitle: z.string().trim().optional().or(z.literal("")),
  refereeOrganisation: z.string().trim().optional().or(z.literal("")),
  refereePhone: z.string().trim().optional().or(z.literal("")),

  relationship: z.string().trim().min(1),
  capacityKnown: z.string().trim().min(1),
  durationKnown: z.string().trim().min(1),
  contactFrequency: z.string().trim().min(1),

  rolesAndDuties: z.string().trim().min(1),
  strengths: z.string().trim().min(1),
  areasForImprovement: z.string().trim().min(1),
  workQuality: z.string().trim().min(1),
  reliabilityComments: z.string().trim().min(1),
  teamworkComments: z.string().trim().min(1),
  leadershipComments: z.string().trim().optional().or(z.literal("")),
  stressResponseComments: z.string().trim().min(1),

  honestyIntegrity: z.string().trim().min(1),
  trustworthiness: z.string().trim().min(1),
  discretionConfidentiality: z.string().trim().min(1),
  loyaltyAllegiance: z.string().trim().min(1),
  financialResponsibility: z.string().trim().min(1),
  substanceConcerns: z.string().trim().min(1),
  legalConcerns: z.string().trim().min(1),
  foreignInfluenceConcerns: z.string().trim().min(1),
  vulnerabilitiesConcerns: z.string().trim().min(1),

  wouldRehire: z.string().trim().min(1),
  recommendForTrustedRole: z.string().trim().min(1),
  additionalComments: z.string().trim().optional().or(z.literal("")),

  declarationTrue: z.boolean().refine((v) => v === true, "You must confirm the declaration"),
  declarationConsent: z.boolean().refine((v) => v === true, "You must give consent"),
  signedName: z.string().trim().min(2, "Please type your full name to sign"),
});

export type ReferenceResponseInput = z.infer<typeof referenceResponseSchema>;
