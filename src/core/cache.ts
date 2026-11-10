/**
 * Edition cache over a KeyValueStore. Pure orchestration: no DOM, no WXT.
 * The content script decides *when* to use it; this module owns *how*.
 */
import type { Edition, EditionWindow, KeyValueStore } from "../shared/types";

/** Bumped when the Edition shape changes; invalidates old caches. */
export const EDITION_SCHEMA_VERSION = 1;

/** How many days of history to keep (editions older than this are pruned). */
export const PRUNE_KEEP_DAYS = 7;

const EDITION_PREFIX = "edition:";
const REPRINT_PREFIX = "reprint:";
const EDITION_KEY_RE = /^edition:(\d{4}-\d{2}-\d{2}):([a-z]+)$/;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Local calendar day as `YYYY-MM-DD`. */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Storage key for one edition. */
export function editionKey(date: string, window: EditionWindow): string {
  return `${EDITION_PREFIX}${date}:${window}`;
}

/** Reads a stored edition (no validity checks). */
export async function getEdition(
  store: KeyValueStore,
  date: string,
  window: EditionWindow
): Promise<Edition | undefined> {
  return store.get<Edition>(editionKey(date, window));
}

/** Reads an edition only if it is valid for this date/window/adapter. */
export async function getValidEdition(
  store: KeyValueStore,
  opts: { date: string; window: EditionWindow; adapterVersion: number }
): Promise<Edition | undefined> {
  const edition = await getEdition(store, opts.date, opts.window);
  if (!edition) return undefined;
  const valid =
    edition.date === opts.date &&
    edition.window === opts.window &&
    edition.schemaVersion === EDITION_SCHEMA_VERSION &&
    edition.adapterVersion === opts.adapterVersion;
  return valid ? edition : undefined;
}

/** Persists an edition under its date/window key. */
export async function saveEdition(
  store: KeyValueStore,
  edition: Edition
): Promise<void> {
  await store.set(editionKey(edition.date, edition.window), edition);
}

/** Deletes one edition (used by the manual reprint). */
export async function removeEdition(
  store: KeyValueStore,
  date: string,
  window: EditionWindow
): Promise<void> {
  await store.remove(editionKey(date, window));
}

type EditionKey = { date: string; window: string; key: string };

function parseEditionKeys(keys: string[]): EditionKey[] {
  const out: EditionKey[] = [];
  for (const key of keys) {
    const m = EDITION_KEY_RE.exec(key);
    if (m) out.push({ date: m[1]!, window: m[2]!, key });
  }
  return out;
}

/**
 * Most recent edition strictly before `beforeDate` for the given window.
 * Used as the stale fallback when a fresh harvest yields nothing.
 */
export async function getLatestEdition(
  store: KeyValueStore,
  beforeDate: string,
  window: EditionWindow
): Promise<Edition | undefined> {
  const candidates = parseEditionKeys(await store.keys())
    .filter((e) => e.window === window && e.date < beforeDate)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (!candidates.length) return undefined;

  const newestDate = candidates[0]!.date;
  let best: Edition | undefined;
  for (const c of candidates) {
    if (c.date !== newestDate) break;
    const edition = await store.get<Edition>(c.key);
    if (edition && (!best || edition.createdAt > best.createdAt)) best = edition;
  }
  return best;
}

const dayNumber = (date: string): number => {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y!, (m ?? 1) - 1, d ?? 1) / 86_400_000);
};

/** Removes editions older than `keepDays` days. Non-edition keys are untouched. */
export async function pruneEditions(
  store: KeyValueStore,
  today: string,
  keepDays: number = PRUNE_KEEP_DAYS
): Promise<void> {
  const todayNum = dayNumber(today);
  for (const e of parseEditionKeys(await store.keys())) {
    if (todayNum - dayNumber(e.date) > keepDays) await store.remove(e.key);
  }
}

/** True when the daily reprint has not been used yet for `date`. */
export async function canReprint(
  store: KeyValueStore,
  date: string
): Promise<boolean> {
  return (await store.get<boolean>(`${REPRINT_PREFIX}${date}`)) !== true;
}

/** Marks the daily reprint as used for `date`. */
export async function markReprint(
  store: KeyValueStore,
  date: string
): Promise<void> {
  await store.set(`${REPRINT_PREFIX}${date}`, true);
}
