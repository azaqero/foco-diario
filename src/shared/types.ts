/** A post extracted from a social feed and ready for the paper. */
export interface FeedItem {
  /** Stable per-post key: `${author}|${text.slice(0, 60)}`. */
  key: string;
  author: string;
  /** Raw timestamp label shown next to the author. */
  timestamp: string;
  /** Parsed epoch in ms, or -1 when it could not be parsed. */
  ts: number;
  text: string;
  headline: string;
  imageUrl: string | null;
}

/** Selectors for a single network. Data, never render code. */
export interface AdapterFields {
  text: string;
  textFallback: string;
  author: string;
  image: string;
  video: string;
  timestampAnchor: string;
}

export interface Adapter {
  id: string;
  version: number;
  match: string[];
  /** Paths (on any matched host) that count as the network's home feed. */
  homePaths: string[];
  item: string;
  fields: AdapterFields;
}

/** Timing knobs for the virtualized-feed scroll harvest. */
export interface HarvestTuning {
  settleMs: number;
  expandWaitMs: number;
  expandPollMs: number;
  scrollStep: number;
  harvestMaxSteps: number;
  harvestIdleLimit: number;
  harvestMaxMs: number;
  feedWaitMs: number;
}

/** Time window an edition belongs to. Free is fixed to `day`. */
export type EditionWindow = "day" | "work" | "off";

/** A saved front page, cacheable across page loads within its window. */
export interface Edition {
  /** `${date}:${window}`. */
  id: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  window: EditionWindow;
  schemaVersion: number;
  adapterVersion: number;
  /** Epoch ms when the edition was harvested. */
  createdAt: number;
  items: FeedItem[];
}

/** Editorial identity and layout limits of the paper. */
export interface PaperConfig {
  appName: string;
  projectUrl: string;
  headlineMax: number;
  minImages: number;
}

/**
 * Localized, user-facing strings. Kept separate from PaperConfig so the core
 * renderer never touches the browser i18n API.
 */
export interface PaperCopy {
  tagline: string;
  membership: string;
  loading: string;
  empty: string;
  end: string;
  closeLabel: string;
  /** Shown when a previous-day edition is displayed because harvest failed. */
  stale: string;
  /** Manual reprint action label. */
  reprint: string;
  /** Shown when the daily reprint limit was already used. */
  reprintLimited: string;
}

/** Minimal async key/value contract so cache logic is testable without a browser. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  /** Every key currently stored, for index-free pruning. */
  keys(): Promise<string[]>;
}
