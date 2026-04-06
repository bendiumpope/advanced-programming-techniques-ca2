const PBKDF2_ITERATIONS = 120_000;
const AES_BITS = 256;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  if (clean.length % 2 !== 0) throw new Error("Invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type SecretPayload = {
  password: string;
  username?: string;
  notes?: string;
};

export async function deriveVaultKey(
  masterPassword: string,
  vaultSaltHex: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const salt = hexToBytes(vaultSaltHex);
  const saltBuf = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength
  ) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: AES_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecretPayload(
  key: CryptoKey,
  payload: SecretPayload
): Promise<{ encrypted_payload: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
  const enc = new TextEncoder();
  const plain = enc.encode(JSON.stringify(payload));
  const plainBuf = plain.buffer.slice(
    plain.byteOffset,
    plain.byteOffset + plain.byteLength
  ) as ArrayBuffer;
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBuf }, key, plainBuf)
  );
  return {
    encrypted_payload: bytesToBase64(ct),
    iv: bytesToBase64(iv),
  };
}

export async function decryptSecretPayload(
  key: CryptoKey,
  encryptedPayloadB64: string,
  ivB64: string
): Promise<SecretPayload> {
  const iv = base64ToBytes(ivB64);
  const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
  const ct = base64ToBytes(encryptedPayloadB64);
  const ctBuf = ct.buffer.slice(ct.byteOffset, ct.byteOffset + ct.byteLength) as ArrayBuffer;
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, ctBuf);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plain)) as SecretPayload;
}
