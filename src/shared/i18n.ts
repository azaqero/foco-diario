/**
 * Localized copy loaded from the extension i18n catalog.
 * This is the only place that reads `browser.i18n` for paper strings; the core
 * renderer receives plain data.
 */
import { browser } from "wxt/browser";
import { DEFAULT_COPY } from "./copy";
import type { PaperCopy } from "./types";

/** Catalog key, typed from the generated WXT overloads. */
type MessageKey = Parameters<typeof browser.i18n.getMessage>[0];

/** Returns the translated message, or the fallback when it is missing. */
export function translate(key: MessageKey, fallback: string): string {
  try {
    return browser.i18n.getMessage(key) || fallback;
  } catch {
    return fallback;
  }
}

/** Builds the paper copy for the current browser UI language. */
export function loadPaperCopy(): PaperCopy {
  return {
    tagline: translate("paperTagline", DEFAULT_COPY.tagline),
    membership: translate("paperMembership", DEFAULT_COPY.membership),
    loading: translate("paperLoading", DEFAULT_COPY.loading),
    empty: translate("paperEmpty", DEFAULT_COPY.empty),
    end: translate("paperEnd", DEFAULT_COPY.end),
    closeLabel: translate("lightboxClose", DEFAULT_COPY.closeLabel),
    stale: translate("paperStale", DEFAULT_COPY.stale),
    reprint: translate("paperReprint", DEFAULT_COPY.reprint),
    reprintLimited: translate("paperReprintLimited", DEFAULT_COPY.reprintLimited),
  };
}
