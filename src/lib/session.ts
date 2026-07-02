export const SESSION_COOKIE = "reviewer_session";
const SESSION_PAYLOAD = "reviewer";

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set.");
  }
  return secret;
}

export function getReviewerPassword(): string {
  const password = process.env.REVIEWER_PASSWORD;
  if (!password) {
    throw new Error("REVIEWER_PASSWORD is not set.");
  }
  return password;
}

export async function createSessionToken(secret: string): Promise<string> {
  const signature = await hmacSha256Hex(secret, SESSION_PAYLOAD);
  return `${SESSION_PAYLOAD}.${signature}`;
}

export async function isValidSessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (payload !== SESSION_PAYLOAD) return false;

  const expected = await hmacSha256Hex(secret, payload);
  return timingSafeEqualHex(signature, expected);
}

export function verifyReviewerPassword(input: string, expected: string): boolean {
  const a = new TextEncoder().encode(input);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a[index] ^ b[index];
  }
  return result === 0;
}

export async function isReviewerAuthenticated(
  token: string | undefined,
): Promise<boolean> {
  try {
    return isValidSessionToken(token, getAuthSecret());
  } catch {
    return false;
  }
}
