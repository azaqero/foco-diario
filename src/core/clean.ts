/**
 * Text pipeline for feed posts: normalize -> strip noise -> de-shout -> headline.
 * Pure string functions only; no DOM, no browser APIs.
 */

/** NFKC folds decorative "fonts": 𝐂𝐎𝐍𝐅𝐄𝐒𝐈Ó𝐍 / 𝓗𝓸𝓵𝓪 -> CONFESIÓN / Hola (accents kept). */
export const normalizeUnicode = (s: string): string => (s || "").normalize("NFKC");

/** Removes the "see more/less" toggle Facebook appends to post text. */
export const cleanText = (s: string): string =>
  s
    .replace(
      /\s*(…|\.\.\.)?\s*(Ver\s+más|Ver\s+menos|See\s+more|See\s+less)\s*$/i,
      ""
    )
    .trim();

/** True when the text is collapsed (ends in "Ver más"/"See more"). */
export const TRUNCATED_RE = /(…|\.\.\.)?\s*(Ver\s+más|See\s+more)\s*$/i;

/** Detects a truncated text node. */
export const isTruncated = (s: string): boolean => TRUNCATED_RE.test(s);

const BARE_URL_RE =
  /\b(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|pe|net|org|info|gob|edu|tv|me|ly|gl|app|co|io|es|us|mx|ar|cl|ec|bo|ve|py|uy|do|gt|cr|pa|site|online|blog|news|shop)(?:\/\S*)?/gi;

/** Removes URLs with or without scheme and collapses whitespace. */
export const stripUrls = (s: string): string =>
  s
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(BARE_URL_RE, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * Fixes markup artifacts: stray pipes, markdown asterisks, odd leading punctuation
 * (`: *¡...`), and missing space after . ! ? , ; : (but decimals like `3.8` stay intact).
 */
export const tidyText = (s: string): string =>
  s
    .replace(/\s*\|\s*/g, " ")
    .replace(/\*/g, " ")
    .replace(/^\s*[:;,.\-•·]+\s*/u, "")
    .replace(/([.!?])(?=\p{L})/gu, "$1 ")
    .replace(/([,;:])(?=\p{L})/gu, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();

const CTA_PATTERNS: RegExp[] = [
  /Ent[ée]rate m[áa]s en [^.!?\n]{0,100}/gi,
  /Lee (?:la |m[áa]s |mas )?nota completa(?![a-záéíóúüñ]):?/gi,
  /Lee m[áa]s(?![a-záéíóúüñ]):?/gi,
  /Ver (?:la )?nota completa(?![a-záéíóúüñ]):?/gi,
  /M[áa]s informaci[óo]n (?:aqu[íi]|en)\b[^.!?\n]{0,60}/gi,
  /(?:Conoce|Mira|Revisa|Descarga|Ent[ée]rate|Consulta|Escucha)[^.!?\n]{0,70}?(?:AQU[ÍI]|aqu[íi])(?![a-záéíóúüñ])[:.]?/gi,
  /Conoce (?:m[áa]s|si)\b[^.!?\n]{0,80}/gi,
  /en (?:el|los) (?:primer )?(?:comentario|comentarios)\b[:.]?/gi,
  /wa\.\s*link\/\S+/gi,
  /Escr[íi]benos\b[^.!?\n]{0,60}/gi,
  /S[íi]gueme\b[^.!?\n]{0,60}/gi,
  /[,.]?\s*(?:en )?(?:nuestra )?cobertura especial\s*,?/gi,
];

const TRAILING_CTA_RE =
  /\s*(?:(?:Conoce|Ent[ée]rate|Lee|Ver|Mira|Revisa)\s+m[áa]s|todos los detalles)\s*[.:]?\s*$|\s*(?:en\s+)?(?:Whats?app|Telegram|Twitter|Facebook|Instagram)\b(?:\s+(?:Whats?app|Telegram|Twitter|Facebook|Instagram)\b)*\s*[.:]?\s*$|\s*(?:Solo|Sólo) por\b[^.!?\n]{0,50}$/i;

/** Removes calls to action, including stacked trailing hooks. */
export const stripCtas = (s: string): string => {
  let out = s;
  for (const re of CTA_PATTERNS) out = out.replace(re, " ");
  let changed = true;
  while (changed) {
    changed = false;
    const next = out.replace(TRAILING_CTA_RE, "").trim();
    if (next !== out) {
      out = next;
      changed = true;
    }
  }
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/(?:\.\s*){2,}/g, ". ")
    .replace(/([!?])\s*\./g, "$1")
    .replace(/…+\s*$/u, "")
    .replace(/\s*\(\s*[:;][^)]*\)\s*$/u, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
};

/**
 * Collapses a repeated block at the end (duplicated headline, text A+A).
 * Accepts a single-space or zero-width separator between both copies.
 */
export function dedupeRepeat(s: string): string {
  let out = (s || "").trim();
  let changed = true;
  while (changed) {
    changed = false;
    const n = out.length;
    for (let len = Math.floor(n / 2); len >= 12 && !changed; len--) {
      const tail = out.slice(n - len);
      for (let gap = 0; gap <= 1; gap++) {
        const end = n - len - gap;
        const start = end - len;
        if (start < 0) continue;
        if (out.slice(start, end) === tail) {
          out = out.slice(0, n - len - gap).replace(/\s+$/, "").trim();
          changed = true;
          break;
        }
      }
    }
  }
  return out;
}

/** Removes hashtags (#word) and normalizes spaces. */
export const stripHashtags = (s: string): string =>
  s.replace(/#[\p{L}\p{N}_]+/gu, " ").replace(/\s{2,}/g, " ").trim();

/**
 * True when the text is predominantly uppercase (>=60% of letters) and has
 * several words, so it catches "La CRUZ DE..." without breaking lone acronyms.
 */
export const isShouty = (s: string): boolean => {
  if (!/\s/.test(s)) return false;
  const letters = s.replace(/[^\p{L}]/gu, "");
  if (!letters.length) return false;
  const upper = (letters.match(/\p{Lu}/gu) || []).length;
  return upper / letters.length >= 0.6;
};

/** Uppercases the first letter, skipping opening punctuation (¡ ¿ " "). */
export const capitalizeFirstLetter = (s: string): string => {
  const i = s.search(/\p{L}/u);
  if (i === -1) return s;
  return s.slice(0, i) + s[i]!.toUpperCase() + s.slice(i + 1);
};

/** Uppercases the start of every sentence (start, after . ! ? or newline). */
export const capitalizeSentences = (s: string): string =>
  s.replace(
    /(^|[.!?]\s*|\n\s*)([^\p{L}]*)(\p{L})/gu,
    (_m, pre: string, mid: string, ch: string) => pre + mid + ch.toUpperCase()
  );

/**
 * De-shouts runs: lowers blocks of 2+ consecutive uppercase words
 * ("DENUNCIA CONSTITUCIONAL CONTRA EL SENADO") without touching lone acronyms
 * or eating the first letter of an already-capitalized word ("Los").
 */
export const deshoutRuns = (s: string): string =>
  s.replace(
    /\p{Lu}[\p{Lu}\p{M}.]*(?![a-záéíóúüñ])(?:\s+\p{Lu}[\p{Lu}\p{M}.]*(?![a-záéíóúüñ]))+/gu,
    (run) => capitalizeFirstLetter(run.toLowerCase())
  );

/**
 * De-shouts a single uppercase word that looks like a word (not an acronym):
 * >=6 letters, 2+ vowels, vowel ratio >=30%. Example: DOLOROSO.
 */
export const deshoutSingleCaps = (s: string): string =>
  s.replace(/\p{Lu}[\p{Lu}\p{M}]+/gu, (word: string, offset: number) => {
    const letters = word.replace(/[^\p{L}]/gu, "");
    if (letters.length < 6) return word;
    const vowels = (letters.match(/[AEIOUÁÉÍÓÚÜ]/g) || []).length;
    if (vowels < 2 || vowels / letters.length < 0.3) return word;
    const lower = word.toLowerCase();
    const before = s.slice(0, offset).trimEnd();
    return !before || /[.!?\n]$/.test(before)
      ? capitalizeFirstLetter(lower)
      : lower;
  });

/**
 * All-uppercase text becomes sentence case per sentence; mixed text only
 * lowers shouted runs and standalone shouted words.
 */
export const deshout = (s: string): string =>
  isShouty(s) ? capitalizeSentences(s.toLowerCase()) : deshoutSingleCaps(deshoutRuns(s));

/**
 * First sentence, keeping its closing punctuation (¡Aumento confirmado!).
 * A "." between digits does not close a sentence (decimals: 3.8).
 */
export const firstSentence = (s: string): string => {
  const m = (s || "").match(/^[\s\S]*?(?:(?<!\d)\.(?!\d)|[!?\n])+/);
  return (m ? m[0] : s || "").trim();
};

const TRAILING_STOP =
  /\s+(?:de|del|el|la|los|las|un|una|en|y|o|u|a|al|que|con|por|para|su|sus|se|lo|le|ni|no|es|son|m[áa]s)$/i;

/**
 * Headline ceiling: cuts on a word boundary, no ellipsis, and never leaves
 * a dangling connector ("...no", "...a", "...que").
 */
export const clampHeadline = (s: string, max: number): string => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  let out = (sp > 20 ? cut.slice(0, sp) : cut).trim();
  while (out.length > 20 && TRAILING_STOP.test(out)) {
    out = out.replace(TRAILING_STOP, "").trim();
  }
  return out;
};

/**
 * Headline: no hashtags. All-uppercase headlines become sentence case; otherwise
 * the original casing is preserved.
 */
export const normalizeTitle = (s: string): string => {
  const t = stripHashtags(s || "").trim();
  if (!t) return "";
  return capitalizeFirstLetter(isShouty(t) ? t.toLowerCase() : t);
};

/**
 * Full body pipeline used for an extracted post.
 * Order matters: normalize -> toggle -> urls -> markup -> CTAs -> hashtags -> de-shout -> dedupe.
 */
export const cleanBody = (raw: string): string =>
  dedupeRepeat(
    deshout(stripHashtags(stripCtas(tidyText(stripUrls(cleanText(normalizeUnicode(raw)))))))
  );
