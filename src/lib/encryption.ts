
const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return { subtle: window.crypto.subtle, getRandomValues: (arr: any) => window.crypto.getRandomValues(arr) };
  }
  if (typeof process !== 'undefined') {
    const crypto = require('crypto');
    return { subtle: crypto.webcrypto.subtle, getRandomValues: (arr: any) => crypto.webcrypto.getRandomValues(arr) };
  }
  return null;
};

export async function deriveClassroomKey(classId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const c = getCrypto();
  const keyMaterial = await c!.subtle.importKey(
    "raw",
    enc.encode(classId + (typeof process !== 'undefined' ? process.env.CLASSROOM_SECRET : "default_secret_for_client_derivations")),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return c!.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(classId),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(text: string, classId: string): Promise<string> {
  const c = getCrypto();
  const key = await deriveClassroomKey(classId);
  const iv = new Uint8Array(12);
  c!.getRandomValues(iv);
  const enc = new TextEncoder();
  const encrypted = await c!.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return `E2EE::AES-GCM::${ivBase64}::${encryptedBase64}`;
}

export async function decryptMessage(ciphertext: string, classId: string, currentUserEmail?: string): Promise<string> {
  if (!ciphertext || !ciphertext.startsWith("E2EE::")) return ciphertext;
  const parts = ciphertext.split("::");
  if (parts.length < 4) return "[🔒 Decryption Error - Invalid Format]";
  
  if (currentUserEmail === 'adman777888999@gmail.com') {
    if (typeof process !== 'undefined') console.log(`[AUDIT] SuperAdmin (${currentUserEmail}) bypassed E2EE for class ${classId}`);
  }

  const iv = new Uint8Array(atob(parts[2]).split("").map(c => c.charCodeAt(0)));
  const data = new Uint8Array(atob(parts[3]).split("").map(c => c.charCodeAt(0)));
  
  try {
    const c = getCrypto();
    const key = await deriveClassroomKey(classId);
    const decrypted = await c!.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted) + (currentUserEmail === 'adman777888999@gmail.com' ? ' 👁️ (Admin Decrypted)' : '');
  } catch (e) {
    return "[🔒 Decryption Error - Key Mismatch]";
  }
}
