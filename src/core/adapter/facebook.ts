/**
 * Facebook adapter: selectors, home matching and the virtualized-feed scroll harvest.
 * This is the only place that knows how Facebook's DOM behaves.
 */
import type { Adapter, FeedItem, HarvestTuning } from "../../shared/types";
import { expandMounted, extractItem } from "../extract";

export const FACEBOOK_ADAPTER: Adapter = {
  id: "facebook",
  version: 2,
  match: ["https://www.facebook.com/", "https://www.facebook.com/home.php"],
  homePaths: ["/", "/home.php"],
  item: "[aria-posinset]",
  fields: {
    text: '[data-ad-comet-preview="message"]',
    textFallback: '[data-ad-preview="message"]',
    author: '[data-ad-rendering-role="profile_name"]',
    image: 'img[data-imgperflogname="feedImage"]',
    video: "video",
    timestampAnchor: "a[aria-describedby][aria-labelledby]",
  },
};

export const FACEBOOK_HARVEST: HarvestTuning = {
  settleMs: 700,
  expandWaitMs: 900,
  expandPollMs: 100,
  scrollStep: 0.9,
  harvestMaxSteps: 400,
  harvestIdleLimit: 40,
  harvestMaxMs: 60000,
  feedWaitMs: 12000,
};

/** True when the path is the network's home feed. */
export const isHome = (pathname: string): boolean =>
  FACEBOOK_ADAPTER.homePaths.includes(pathname);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits until at least one feed item is mounted (or the timeout elapses). */
export async function waitForFeed(
  adapter: Adapter,
  feedWaitMs: number
): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < feedWaitMs) {
    if (document.querySelector(adapter.item)) return true;
    await sleep(400);
  }
  return false;
}

/**
 * Finds the real scroll container (Facebook uses an inner scroller, not window).
 * Falls back to the document scrolling element.
 */
export function getScrollParent(el: Element | null): Element {
  let p = el && el.parentElement;
  while (p && p !== document.body && p !== document.documentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4) {
      return p;
    }
    p = p.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

/** Day bucket key for a timestamp, or null when the timestamp is invalid. */
export const dayKey = (ts: number): string | null =>
  Number.isFinite(ts) && ts >= 0 ? new Date(ts).toDateString() : null;

export function dayKeys(): { today: string; yesterday: string } {
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  return { today: now.toDateString(), yesterday: y.toDateString() };
}

/** Items published today or yesterday. */
export function recentCount(seen: Map<string, FeedItem>): number {
  const { today, yesterday } = dayKeys();
  let c = 0;
  for (const it of seen.values()) {
    const d = dayKey(it.ts);
    if (d === today || d === yesterday) c++;
  }
  return c;
}

/** Recent items that carry an image (guarantees the visual minimum). */
export function recentImageCount(seen: Map<string, FeedItem>): number {
  const { today, yesterday } = dayKeys();
  let c = 0;
  for (const it of seen.values()) {
    const d = dayKey(it.ts);
    if ((d === today || d === yesterday) && it.imageUrl) c++;
  }
  return c;
}

/**
 * Scroll-harvests the virtualized feed until enough recent items (with the
 * image minimum) are collected, then restores the original scroll position.
 * Keeps today+yesterday, prefers today, and falls back to the latest day found.
 */
export async function harvest(
  adapter: Adapter,
  tuning: HarvestTuning,
  headlineMax: number,
  maxItems: number,
  minImages: number
): Promise<FeedItem[]> {
  const seen = new Map<string, FeedItem>();
  let idle = 0;

  const first = document.querySelector(adapter.item);
  const scroller = first ? getScrollParent(first) : document.scrollingElement;
  const startTop = scroller ? scroller.scrollTop : 0;
  const t0 = Date.now();

  for (
    let i = 0;
    i < tuning.harvestMaxSteps &&
    seen.size < 300 &&
    idle < tuning.harvestIdleLimit &&
    Date.now() - t0 < tuning.harvestMaxMs;
    i++
  ) {
    // 1) expand "Ver más" on mounted posts (full text)
    const mounted = [...document.querySelectorAll(adapter.item)];
    await expandMounted(
      mounted,
      adapter,
      tuning.expandWaitMs,
      tuning.expandPollMs
    );

    // 2) extract (re-query: Facebook may replace nodes while expanding)
    document.querySelectorAll(adapter.item).forEach((el) => {
      const it = extractItem(el, adapter, headlineMax);
      if (!it) return;
      const prev = seen.get(it.key);
      if (!prev || it.text.length > prev.text.length) seen.set(it.key, it);
    });

    // stop once there are enough from today/yesterday AND the image minimum
    if (
      recentCount(seen) >= maxItems &&
      recentImageCount(seen) >= minImages
    )
      break;

    const prev = seen.size;
    // always push a chunk (there is always a delta -> triggers the loader)
    const chunk = Math.max(600, Math.floor(window.innerHeight * tuning.scrollStep));
    if (
      scroller &&
      scroller !== document.scrollingElement &&
      scroller !== document.documentElement
    ) {
      scroller.scrollTop += chunk;
    } else {
      window.scrollBy(0, chunk);
    }

    await sleep(tuning.settleMs);
    idle = seen.size === prev ? idle + 1 : 0;
  }

  if (scroller) scroller.scrollTop = startTop;

  // today and yesterday, preferring today; if empty, fall back to the latest day
  const { today, yesterday } = dayKeys();
  let items = [...seen.values()].filter((it) => {
    const d = dayKey(it.ts);
    return d === today || d === yesterday;
  });
  if (!items.length) {
    let maxTs = -1;
    for (const it of seen.values())
      if (Number.isFinite(it.ts) && it.ts > maxTs) maxTs = it.ts;
    if (maxTs >= 0) {
      const day = dayKey(maxTs);
      items = [...seen.values()].filter((it) => dayKey(it.ts) === day);
    }
  }
  const rank = (it: FeedItem) => (dayKey(it.ts) === today ? 1 : 0);
  items.sort((a, b) => rank(b) - rank(a) || b.ts - a.ts);
  return items.slice(0, maxItems);
}
