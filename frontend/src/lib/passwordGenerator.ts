const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}";

export type GeneratorOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
};

function pickCharset(o: GeneratorOptions): string {
  let s = "";
  if (o.uppercase) s += UPPER;
  if (o.lowercase) s += LOWER;
  if (o.digits) s += DIGITS;
  if (o.symbols) s += SYMBOLS;
  return s || LOWER + DIGITS;
}

export function generatePassword(o: GeneratorOptions): string {
  const charset = pickCharset(o);
  const bytes = new Uint8Array(o.length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < o.length; i++) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}
