function normalizeFileName(fileName: string): string {
  return fileName.trim().toLocaleLowerCase().slice(0, 255);
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLocaleLowerCase().slice(0, 160);
}

export async function computeContentHash(input: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = input instanceof Uint8Array
    ? input
    : new Uint8Array(input);
  // Copy into a fresh ArrayBuffer so Cloudflare's Web Crypto typings do not
  // widen a caller-provided Uint8Array to SharedArrayBuffer.
  const safeBytes = new Uint8Array(bytes.byteLength);
  safeBytes.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', safeBytes.buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The content hash identifies bytes. Metadata is kept in the resume key so a
 * user cannot resume another user's job and renamed files remain distinguishable
 * without pretending that the file content itself changed.
 */
export async function computeFileFingerprint(
  input: ArrayBuffer | Uint8Array,
  fileName: string,
  mimeType: string,
  userId?: string,
): Promise<{ contentHash: string; resumeKey: string }> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const contentHash = await computeContentHash(bytes);
  const owner = (userId || 'anonymous').trim();
  const name = normalizeFileName(fileName);
  const type = normalizeMimeType(mimeType);
  return {
    contentHash: `sha256:${contentHash}`,
    resumeKey: `${owner}:sha256:${contentHash}:size:${bytes.byteLength}:type:${type}:name:${name}`,
  };
}
