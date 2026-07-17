/**
 * SHA-256 hex digest of a UTF-8 string, using the Web Crypto API
 * (`crypto.subtle`) — available globally in the browser and in Node >=19, so
 * the same helper serves both the client-side store and the server data source.
 */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
