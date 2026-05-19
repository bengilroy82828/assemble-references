import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Assemble Solutions References";

export function newTotpSecret(): string {
  // 20-byte base32 secret
  return new Secret({ size: 20 }).base32;
}

export function makeTotp(secretBase32: string, accountLabel: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label: accountLabel,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export async function totpQrDataUrl(secretBase32: string, accountLabel: string): Promise<string> {
  const uri = makeTotp(secretBase32, accountLabel).toString();
  return QRCode.toDataURL(uri, { margin: 1, width: 256 });
}

/**
 * Validates a 6-digit TOTP code. Allows ±1 step (30s) of drift.
 * Returns true if the code matches.
 */
export function verifyTotpCode(secretBase32: string, accountLabel: string, code: string): boolean {
  const cleaned = code.replace(/\s+/g, "").trim();
  if (!/^\d{6}$/.test(cleaned)) return false;
  const delta = makeTotp(secretBase32, accountLabel).validate({ token: cleaned, window: 1 });
  return delta !== null;
}
