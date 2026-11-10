/**
 * DOM extraction for one feed item: text, author, timestamp, image, ad detection.
 * Depends on an Adapter (selectors) but never on the network itself.
 */
import type { Adapter, FeedItem } from "../shared/types";
import {
  clampHeadline,
  cleanBody,
  firstSentence,
  isTruncated,
  normalizeTitle,
  normalizeUnicode,
} from "./clean";

/** Trimmed text content of an element (empty string when missing). */
export const txt = (el: Element | null): string =>
  el ? (el.textContent || "").trim() : "";

const MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, december: 11,
};

function buildDate(
  y: string,
  mo: number,
  d: string,
  h: string,
  mi: string,
  ap: string | undefined
): number {
  let hh = Number(h);
  if (ap === "pm" && hh < 12) hh += 12;
  if (ap === "am" && hh === 12) hh = 0;
  return new Date(Number(y), mo, Number(d), hh, Number(mi)).getTime();
}

/**
 * Parses a Facebook timestamp label into epoch ms.
 * Supports "hace un momento", relative units, Spanish absolute dates and
 * English absolute dates. Returns -1 when it cannot parse.
 */
export function parseTimestamp(s: string): number {
  if (!s) return -1;
  const t = s.toLowerCase();

  if (/hace un momento/.test(t)) return Date.now();
  const rel = t.match(
    /hace\s+(un|una|\d+)\s+(segundo|minuto|hora|d[ií]a|semana|mes|a[nñ]o)s?/
  );
  if (rel) {
    const n = rel[1] === "un" || rel[1] === "una" ? 1 : parseInt(rel[1]!, 10);
    const mult =
      {
        segundo: 1e3, minuto: 6e4, hora: 36e5,
        "día": 864e5, dia: 864e5, semana: 6048e5,
        mes: 2592e6, "año": 31536e6, ano: 31536e6,
      }[rel[2]!] || 6e4;
    return Date.now() - n * mult;
  }

  let m = t.match(
    /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})\s+a\s+las\s+(\d{1,2}):(\d{2})\s*(am|pm)?/
  );
  if (m && MONTHS[m[2]!] !== undefined)
    return buildDate(m[3]!, MONTHS[m[2]!]!, m[1]!, m[4]!, m[5]!, m[6]);

  m = t.match(/([a-z]+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)?/);
  if (m && MONTHS[m[1]!] !== undefined)
    return buildDate(m[3]!, MONTHS[m[1]!]!, m[2]!, m[4]!, m[5]!, m[6]);

  return -1;
}

/** Author name, stripping verified-account tooltips and the follow button. */
export const getAuthor = (item: Element, adapter: Adapter): string => {
  const el = item.querySelector(adapter.fields.author);
  if (!el) return "";
  let a = txt(el.querySelector("h4")) || txt(el);
  a = a
    .replace(/\s*Las cuentas que tienen una insignia.*$/i, "")
    .replace(
      /\s*(?:Cuenta verificada|Verified account|Meta Verified|transmiti[óo] en vivo|est[áa] transmitiendo en vivo).*$/i,
      ""
    );
  return normalizeUnicode(a)
    .replace(/\s*(·\s*)?(Seguir|Follow|Unirte|Unirse)\s*$/i, "")
    .replace(/\s*(Cuenta verificada|Verified account)\s*$/i, "")
    .replace(/\s+(?:está con|está en|se encuentra en|is with|is at)\s+.*$/i, "")
    .replace(/\s*·\s*$/g, "")
    .trim();
};

/** Timestamp label resolved from the anchor's aria-described/labelled ids. */
export const getTimestamp = (item: Element, adapter: Adapter): string => {
  const a = item.querySelector(adapter.fields.timestampAnchor);
  if (!a) return "";
  const absId = a.getAttribute("aria-describedby");
  const relId = a.getAttribute("aria-labelledby");
  const abs = absId ? document.getElementById(absId) : null;
  const rel = relId ? document.getElementById(relId) : null;
  return txt(abs) || txt(rel) || "";
};

/** True for sponsored posts (CTA role marker or "Patrocinado/Sponsored" text). */
export const isAd = (item: Element): boolean =>
  !!item.querySelector('[data-ad-rendering-role^="cta"]') ||
  /\b(Patrocinado|Sponsored)\b/.test(txt(item).slice(0, 500));

/** The element holding the post body, trying the adapter's text fallbacks. */
export function getTextEl(item: Element, adapter: Adapter): Element | null {
  const f = adapter.fields;
  return (
    item.querySelector(f.text) ||
    item.querySelector(f.textFallback) ||
    item.querySelector('[data-ad-rendering-role="story_message"]')
  );
}

const SEE_MORE_RE = /^(ver\s+más|ver\s+mas|see\s+more)$/i;
const clickedSeeMore = new WeakSet<Element>();

/** Finds the "Ver más"/"See more" button inside a post. */
export function findSeeMore(root: Element): Element | null {
  const btns = root.querySelectorAll('[role="button"]');
  for (const el of btns) {
    if (SEE_MORE_RE.test(txt(el))) return el;
  }
  for (const el of root.querySelectorAll("span, div")) {
    if (el.children.length === 0 && SEE_MORE_RE.test(txt(el))) return el;
  }
  return null;
}

/** Clicks "Ver más" when the post text is truncated. Returns true if it clicked. */
export function expandItem(item: Element, adapter: Adapter): boolean {
  const textEl = getTextEl(item, adapter);
  if (!textEl) return false;
  const raw = txt(textEl);
  if (!isTruncated(raw)) return false; // not truncated

  const btn = findSeeMore(textEl) || findSeeMore(item);
  if (!btn || clickedSeeMore.has(btn)) return false;
  clickedSeeMore.add(btn);
  (btn as HTMLElement).click();
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Expands every truncated mounted post and waits for the expansion to apply. */
export async function expandMounted(
  nodes: Element[],
  adapter: Adapter,
  expandWaitMs: number,
  expandPollMs: number
): Promise<void> {
  let clicked = false;
  for (const el of nodes) {
    if (expandItem(el, adapter)) clicked = true;
  }
  if (!clicked) return;

  const t0 = Date.now();
  while (Date.now() - t0 < expandWaitMs) {
    const live = [...document.querySelectorAll(adapter.item)];
    const stillTruncated = live.some((el) => {
      const te = getTextEl(el, adapter);
      return te && isTruncated(txt(te));
    });
    if (!stillTruncated) break;
    await sleep(expandPollMs);
  }
}

/**
 * Extracts one post into a FeedItem, or null when it does not belong in the paper.
 * Drops ads, text-less items (image/video without caption) and title-only cards.
 */
export function extractItem(
  item: Element,
  adapter: Adapter,
  headlineMax: number
): FeedItem | null {
  const f = adapter.fields;
  const textEl = getTextEl(item, adapter);
  const text = cleanBody(txt(textEl));
  const img = item.querySelector(f.image);
  const video = item.querySelector(f.video);
  const author = getAuthor(item, adapter);

  // requires text (after hashtag removal): drops image/video posts without caption
  if (!text) return null;
  if (isAd(item)) return null;

  // title: first sentence, word-boundary ceiling (no ellipsis)
  const headline = clampHeadline(
    normalizeTitle(firstSentence(text) || text),
    headlineMax
  );
  if (!headline) return null;

  // no body: the text is only the headline -> the card would show nothing
  if (text.trim().toLowerCase() === headline.trim().toLowerCase()) return null;

  const timestamp = getTimestamp(item, adapter);
  const ts = parseTimestamp(timestamp);

  // main image: feed img, or the video poster. Extracted for every item so the
  // lightbox can show it even when the post is not in the top slots.
  const imageUrl = img
    ? (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src
    : video && (video as HTMLVideoElement).poster
      ? (video as HTMLVideoElement).poster
      : null;

  return {
    // stable per-post key: text prefix (same when truncated or expanded),
    // so the full version replaces the short one instead of duplicating it
    key: `${author}|${text.slice(0, 60)}`,
    author,
    timestamp,
    ts,
    text,
    headline,
    imageUrl,
  };
}
