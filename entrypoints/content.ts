/**
 * Content script: mounts the paper on the Facebook home feed.
 * This is the composition root: cache -> adapter -> harvest -> order -> render.
 */
import { defineContentScript } from "wxt/utils/define-content-script";
import "../src/core/paper.css";
import { FACEBOOK_ADAPTER, FACEBOOK_HARVEST, harvest, isHome, waitForFeed } from "../src/core/adapter/facebook";
import {
  canReprint,
  getLatestEdition,
  getValidEdition,
  localDateKey,
  markReprint,
  pruneEditions,
  removeEdition,
  saveEdition,
  EDITION_SCHEMA_VERSION,
} from "../src/core/cache";
import { arrangeImagesFirst, mountRoot, render } from "../src/core/render";
import { PAPER, maxItemsForWidth } from "../src/shared/config";
import { loadPaperCopy } from "../src/shared/i18n";
import { localStore } from "../src/shared/storage";
import type { Edition, EditionWindow, FeedItem, PaperCopy } from "../src/shared/types";

/** Free tier: one edition per local day. */
const EDITION_WINDOW: EditionWindow = "day";

let running = false;
let pendingRerun = false;

/** Resolves once `document.body` exists (content script runs at document_start). */
function whenBody(): Promise<void> {
  if (document.body) return Promise.resolve();
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

/** Reveals the paper and stops hiding the native site. */
function activatePaper(): void {
  document.documentElement.classList.add("focus-paper-active");
  document.documentElement.classList.remove("fp-booting");
}

/**
 * Pauses media loaded by the underlying feed. The harvest scrolls through many
 * posts that may carry autoplaying videos; those keep decoding under the
 * opaque overlay unless stopped. One-shot: we never fight Facebook's player.
 */
function pauseUnderlyingMedia(): void {
  for (const media of Array.from(
    document.querySelectorAll<HTMLMediaElement>("video, audio")
  )) {
    try {
      media.pause();
    } catch {
      /* ignore detached/invalid media */
    }
  }
}

async function loadAndRender(force: boolean): Promise<void> {
  const today = localDateKey();
  const copy = loadPaperCopy();
  const root = mountRoot();
  const onReprint = () => void reprint(copy);

  // Cache-first: a valid edition renders instantly, without touching the feed.
  if (!force) {
    let cached: Edition | undefined;
    try {
      cached = await getValidEdition(localStore, {
        date: today,
        window: EDITION_WINDOW,
        adapterVersion: FACEBOOK_ADAPTER.version,
      });
    } catch {
      cached = undefined;
    }
    if (cached) {
      pauseUnderlyingMedia();
      activatePaper();
      render(cached.items, root, PAPER, copy, { onReprint });
      void pruneEditions(localStore, today).catch(() => {});
      return;
    }
  }

  // opaque paper immediately: hides the scroll harvest running behind it
  const loading = document.createElement("div");
  loading.className = "fp-loading";
  loading.textContent = copy.loading;
  root.replaceChildren(loading);

  await waitForFeed(FACEBOOK_ADAPTER, FACEBOOK_HARVEST.feedWaitMs);
  let items: FeedItem[] = await harvest(
    FACEBOOK_ADAPTER,
    FACEBOOK_HARVEST,
    PAPER.headlineMax,
    maxItemsForWidth(window.innerWidth),
    PAPER.minImages
  );

  // front page: newest first (hero); invalid timestamps last, stable order
  items.sort((a, b) => {
    const ta = Number.isFinite(a.ts) ? a.ts : -1;
    const tb = Number.isFinite(b.ts) ? b.ts : -1;
    return tb - ta;
  });
  // reorder so the first 3 items always have an image
  items = arrangeImagesFirst(items, PAPER.minImages);

  // Fail-closed with a stale fallback: an empty harvest shows the latest
  // previous-day edition, marked as stale.
  let stale = false;
  if (!items.length) {
    let latest: Edition | undefined;
    try {
      latest = await getLatestEdition(localStore, today, EDITION_WINDOW);
    } catch {
      latest = undefined;
    }
    if (latest) {
      items = latest.items;
      stale = true;
    }
  }

  pauseUnderlyingMedia();
  activatePaper();

  if (items.length && !stale) {
    const edition: Edition = {
      id: `${today}:${EDITION_WINDOW}`,
      date: today,
      window: EDITION_WINDOW,
      schemaVersion: EDITION_SCHEMA_VERSION,
      adapterVersion: FACEBOOK_ADAPTER.version,
      createdAt: Date.now(),
      items,
    };
    try {
      await saveEdition(localStore, edition);
    } catch {
      /* a failed save must not break the render */
    }
  }
  void pruneEditions(localStore, today).catch(() => {});

  render(items, root, PAPER, copy, { stale, onReprint });
}

/** Manual reprint: invalidate today's edition and harvest again, once per day. */
async function reprint(copy: PaperCopy): Promise<void> {
  const today = localDateKey();
  if (!(await canReprint(localStore, today))) {
    const btn = document.querySelector<HTMLButtonElement>(".fp-reprint");
    if (btn) {
      btn.disabled = true;
      btn.textContent = copy.reprintLimited;
    }
    return;
  }

  await markReprint(localStore, today);
  await removeEdition(localStore, today, EDITION_WINDOW);
  await run(true);
}

async function run(force = false): Promise<void> {
  if (!isHome(location.pathname)) return;

  // One harvest at a time: a location change during the (up to 60s) harvest
  // must not start a second concurrent one. Request a rerun instead.
  if (running) {
    pendingRerun = true;
    return;
  }

  running = true;
  try {
    await loadAndRender(force);
  } catch (err) {
    // Never leave the native page hidden if the paper could not mount.
    document.documentElement.classList.remove("fp-booting");
    console.error("[foco-diario] failed to mount the paper", err);
  } finally {
    running = false;
  }

  if (pendingRerun) {
    pendingRerun = false;
    void run();
  }
}

export default defineContentScript({
  matches: ["https://www.facebook.com/*"],
  runAt: "document_start",
  main(ctx) {
    // Hide the native site synchronously, before the first paint.
    if (isHome(location.pathname)) {
      document.documentElement.classList.add("fp-booting");
    }

    void (async () => {
      if (!isHome(location.pathname)) return;
      await whenBody();
      await run();
    })();

    // re-run after SPA navigation (best-effort)
    ctx.addEventListener(window, "wxt:locationchange", () => {
      if (isHome(location.pathname)) {
        document.documentElement.classList.add("fp-booting");
      }
      void run();
    });
  },
});
