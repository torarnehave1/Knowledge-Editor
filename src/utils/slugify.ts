// URL slugs are ASCII-only (the SEO worker matches the raw request path against
// its KV key, so a percent-encoded Unicode slug would never be found). Titles in
// Devanagari are romanised first; anything still unrepresentable is dropped.

const DEVANAGARI_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
  'च': 'c', 'छ': 'ch', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 's', 'ष': 's', 'स': 's', 'ह': 'h', 'ळ': 'l',
};

const DEVANAGARI_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u',
  'ऋ': 'r', 'ॠ': 'r', 'ऌ': 'l', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
};

const DEVANAGARI_MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
  'ृ': 'r', 'ॄ': 'r', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};

const DEVANAGARI_SIGNS: Record<string, string> = {
  'ं': 'm', 'ः': 'h', 'ँ': 'n', 'ॐ': 'om', 'ऽ': '',
};

const VIRAMA = '्';
const NUKTA = '़';
const DEVANAGARI_ZERO = 0x0966;

// Letters NFKD does not decompose into a base letter + combining mark.
const LATIN_EXTRAS: Record<string, string> = {
  'æ': 'ae', 'ø': 'o', 'å': 'a', 'ß': 'ss', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ł': 'l', 'œ': 'oe',
};

function romaniseDevanagari(text: string): string {
  const chars = Array.from(text);
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const consonant = DEVANAGARI_CONSONANTS[ch];
    if (consonant !== undefined) {
      out += consonant;
      if (chars[i + 1] === NUKTA) i++;
      const next = chars[i + 1];
      if (next === VIRAMA) {
        i++;
      } else if (next !== undefined && DEVANAGARI_MATRAS[next] !== undefined) {
        out += DEVANAGARI_MATRAS[next];
        i++;
      } else {
        // No vowel sign and no virama: the consonant carries its inherent "a".
        out += 'a';
      }
      continue;
    }
    if (DEVANAGARI_VOWELS[ch] !== undefined) { out += DEVANAGARI_VOWELS[ch]; continue; }
    if (DEVANAGARI_MATRAS[ch] !== undefined) { out += DEVANAGARI_MATRAS[ch]; continue; }
    if (DEVANAGARI_SIGNS[ch] !== undefined) { out += DEVANAGARI_SIGNS[ch]; continue; }
    const code = ch.codePointAt(0)!;
    if (code >= DEVANAGARI_ZERO && code <= DEVANAGARI_ZERO + 9) { out += String(code - DEVANAGARI_ZERO); continue; }
    out += ch;
  }
  return out;
}

export function slugify(text: string): string {
  return romaniseDevanagari(text || '')
    .toLowerCase()
    .replace(/[æøåßđðþłœ]/g, (c) => LATIN_EXTRAS[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// A title in a script slugify() cannot romanise yields an empty slug; fall back
// to something unique and valid rather than leaving the field blank.
export function slugForGraph(title: string, graphId?: string | null): string {
  return slugify(title) || (graphId ? `graph-${graphId.slice(0, 8)}` : '');
}
