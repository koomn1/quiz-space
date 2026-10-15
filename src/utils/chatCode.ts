/**
 * Cosmo AI — Chat Code Utility
 * 
 * Generates and formats unique, human-readable Chat Codes (e.g. CSM-8K4F2A)
 * tied to individual user conversations.
 */

export function formatChatCode(convId?: string | null): string {
  if (!convId) return 'CSM-NEW';
  
  // If already prefixed with CSM- and valid format
  if (/^CSM-[A-Z0-9]{4,10}$/i.test(convId)) {
    return convId.toUpperCase();
  }

  // Extract alphanumeric characters from id
  const clean = convId.replace(/^(conv-|local-|c-)/, '').replace(/[^a-zA-Z0-9]/g, '');
  
  // Deterministic 32-bit hash
  let hash = 0;
  for (let i = 0; i < convId.length; i++) {
    hash = ((hash << 5) - hash + convId.charCodeAt(i)) | 0;
  }
  const hashStr = Math.abs(hash).toString(36).toUpperCase();
  const suffix = (clean.slice(-3) + hashStr).slice(-6).toUpperCase();
  
  return `CSM-${suffix.padStart(6, '7')}`;
}

export function isValidChatCode(code: string): boolean {
  return /^CSM-[A-Z0-9]{4,10}$/i.test(code.trim());
}

export function matchesChatSearch(query: string, title: string, convId: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  
  // Match title
  if (title.toLowerCase().includes(q)) return true;
  
  // Match code
  const code = formatChatCode(convId).toLowerCase();
  if (code.includes(q) || code.replace('-', '').includes(q)) return true;
  
  // Match raw ID
  if (convId.toLowerCase().includes(q)) return true;
  
  return false;
}
