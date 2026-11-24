export const OWNER_SESSION_COOKIE = "leadpilot_owner_session";
export const OWNER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  email: string;
  issuedAt: number;
  expiresAt: number;
  version: 1;
};

function getSecret() {
  const secret = process.env.LEADPILOT_SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("LEADPILOT_SESSION_SECRET must contain at least 32 characters.");
  return secret;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function signingKey() {
  return globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function getOwnerEmail() {
  return (process.env.LEADPILOT_OWNER_EMAIL || "tnwokobia@gmail.com").trim().toLowerCase();
}

export async function verifyOwnerPassword(candidate: string) {
  const expected = process.env.LEADPILOT_ACCESS_PASSWORD || "";
  if (!expected || !candidate || candidate.length > 256) return false;
  const encoder = new TextEncoder();
  const [expectedHash, candidateHash] = await Promise.all([
    globalThis.crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    globalThis.crypto.subtle.digest("SHA-256", encoder.encode(candidate))
  ]);
  const a = new Uint8Array(expectedHash);
  const b = new Uint8Array(candidateHash);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function createOwnerSession(email = getOwnerEmail()) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    email: email.toLowerCase(),
    issuedAt: now,
    expiresAt: now + OWNER_SESSION_MAX_AGE_SECONDS,
    version: 1
  };
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(encodedPayload)
  );
  return encodedPayload + "." + toBase64Url(new Uint8Array(signature));
}

export async function verifyOwnerSession(token?: string | null) {
  if (!token || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  try {
    const validSignature = await globalThis.crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      fromBase64Url(parts[1]),
      new TextEncoder().encode(parts[0])
    );
    if (!validSignature) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    return payload.version === 1 &&
      payload.email === getOwnerEmail() &&
      Number.isFinite(payload.expiresAt) &&
      Number.isFinite(payload.issuedAt) &&
      payload.issuedAt <= now + 60 &&
      payload.expiresAt > now &&
      payload.expiresAt - payload.issuedAt <= OWNER_SESSION_MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}
