/**
 * Secure API-key helpers shared by the dashboard's key UIs.
 *
 * We only store a SHA-256 hash + a short display prefix in Supabase; the full
 * plaintext key is generated client-side and shown exactly once at creation.
 */

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "tk_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
