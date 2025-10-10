import crypto from "crypto";

/**
 * Generates a secure random string to use as the PKCE code verifier.
 * Must be between 43 and 128 characters long.
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString("base64url");
}

/**
 * Derives a code challenge from the verifier using SHA256.
 * This hashed version is what you send to Google's authorization endpoint.
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}
