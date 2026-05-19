import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "assemble_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: Role;
  email: string;
  mfaVerified: boolean; // true once admin has passed TOTP challenge for this session
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      role: payload.role as Role,
      email: payload.email as string,
      mfaVerified: Boolean(payload.mfaVerified),
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

/**
 * Ensures the request is from an authenticated admin who has completed 2FA
 * for this session. Redirects appropriately if not.
 */
export async function requireAdminWithMfa() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/candidate");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    await destroySession();
    redirect("/login");
  }

  if (!user.totpEnabled) {
    redirect("/admin/setup-2fa");
  }
  if (!session.mfaVerified) {
    redirect("/login/2fa");
  }
  return user;
}

export async function requireCandidate() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN") redirect("/admin");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    await destroySession();
    redirect("/login");
  }
  return user;
}

/** Cryptographically random hex token used in referee and share URLs. */
export function generateReferenceToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Single-use backup codes for 2FA recovery. Returns plaintext list (show once). */
export async function generateBackupCodes(count = 8): Promise<{ plain: string[]; hashes: string[] }> {
  const plain: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    // 10-char hex code, displayed as XXXXX-XXXXX for readability
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    plain.push(`${hex.slice(0, 5)}-${hex.slice(5)}`);
  }
  const hashes = await Promise.all(plain.map((c) => bcrypt.hash(c, 10)));
  return { plain, hashes };
}

/** Find a matching backup code hash (if any). Returns the matched hash for removal, or null. */
export async function findMatchingBackupCode(input: string, hashes: string[]): Promise<string | null> {
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, "");
  for (const h of hashes) {
    if (await bcrypt.compare(cleaned, h)) return h;
  }
  return null;
}
