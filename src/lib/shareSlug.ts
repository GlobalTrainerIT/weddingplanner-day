/**
 * Share links are the only thing standing between a stranger and a couple's
 * RSVP or timeline page, so the random part must not come from Math.random.
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function randomSuffix(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function generateShareSlug(p1: string, p2: string): string {
  const base = `${slugify(p1)}-and-${slugify(p2)}`;
  return `${base}-${randomSuffix()}`;
}
