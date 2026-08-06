const encoder = new TextEncoder();
const decoder = new TextDecoder();
const TAG_BYTES = 16;

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function keyBytes(encodedKey?: string): Uint8Array {
  if (!encodedKey) throw new Error("drive_encryption_not_configured");
  try {
    const bytes = fromBase64Url(encodedKey.trim());
    if (bytes.byteLength !== 32) throw new Error("invalid_length");
    return bytes;
  } catch {
    throw new Error("drive_encryption_not_configured");
  }
}

async function importKey(encodedKey: string | undefined, usage: KeyUsage) {
  const bytes = keyBytes(encodedKey);
  return crypto.subtle.importKey("raw", bytes.buffer as ArrayBuffer, "AES-GCM", false, [usage]);
}

export async function encryptRefreshToken(
  token: string,
  workspaceId: string,
  encodedKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
): Promise<EncryptedToken> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(workspaceId), tagLength: 128 },
    await importKey(encodedKey, "encrypt"),
    encoder.encode(token),
  ));
  return {
    ciphertext: toBase64Url(encrypted.slice(0, -TAG_BYTES)),
    iv: toBase64Url(iv),
    authTag: toBase64Url(encrypted.slice(-TAG_BYTES)),
  };
}

export async function decryptRefreshToken(
  encrypted: EncryptedToken,
  workspaceId: string,
  encodedKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
): Promise<string> {
  const ciphertext = fromBase64Url(encrypted.ciphertext);
  const authTag = fromBase64Url(encrypted.authTag);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(encrypted.iv).buffer as ArrayBuffer, additionalData: encoder.encode(workspaceId), tagLength: 128 },
      await importKey(encodedKey, "decrypt"),
      combined,
    );
    return decoder.decode(plaintext);
  } catch (error) {
    if (error instanceof Error && error.message === "drive_encryption_not_configured") throw error;
    throw new Error("drive_token_decryption_failed");
  }
}
