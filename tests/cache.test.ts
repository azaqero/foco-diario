import { describe, expect, it } from "vitest";
import {
  canReprint,
  editionKey,
  getEdition,
  getLatestEdition,
  getValidEdition,
  localDateKey,
  markReprint,
  pruneEditions,
  removeEdition,
  saveEdition,
  EDITION_SCHEMA_VERSION,
  PRUNE_KEEP_DAYS,
} from "../src/core/cache";
import type { Edition, KeyValueStore } from "../src/shared/types";

class FakeStore implements KeyValueStore {
  readonly map = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }
  async keys(): Promise<string[]> {
    return [...this.map.keys()];
  }
}

const makeEdition = (date: string, overrides: Partial<Edition> = {}): Edition => ({
  id: `${date}:day`,
  date,
  window: "day",
  schemaVersion: EDITION_SCHEMA_VERSION,
  adapterVersion: 2,
  createdAt: Date.now(),
  items: [
    {
      key: "autor|texto",
      author: "Autor",
      timestamp: "",
      ts: 0,
      text: "Titular\nCuerpo.",
      headline: "Titular",
      imageUrl: null,
    },
  ],
  ...overrides,
});

describe("cache keys", () => {
  it("builds a zero-padded local date key", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 10, 9))).toBe("2026-11-09");
  });

  it("builds edition keys from date and window", () => {
    expect(editionKey("2026-11-10", "day")).toBe("edition:2026-11-10:day");
  });
});

describe("edition storage", () => {
  it("round-trips an edition", async () => {
    const store = new FakeStore();
    const edition = makeEdition("2026-11-10");
    await saveEdition(store, edition);

    expect(await getEdition(store, "2026-11-10", "day")).toEqual(edition);
    expect(await getEdition(store, "2026-11-10", "work")).toBeUndefined();
  });

  it("returns a valid edition only when date, window and versions match", async () => {
    const store = new FakeStore();
    await saveEdition(store, makeEdition("2026-11-10"));

    const base = { date: "2026-11-10", window: "day" as const, adapterVersion: 2 };
    expect(await getValidEdition(store, base)).toBeDefined();
    expect(await getValidEdition(store, { ...base, date: "2026-11-11" })).toBeUndefined();
    expect(await getValidEdition(store, { ...base, window: "work" })).toBeUndefined();
    expect(await getValidEdition(store, { ...base, adapterVersion: 3 })).toBeUndefined();

    await saveEdition(store, makeEdition("2026-11-10", { schemaVersion: 999 }));
    expect(await getValidEdition(store, base)).toBeUndefined();
  });

  it("removes a single edition", async () => {
    const store = new FakeStore();
    await saveEdition(store, makeEdition("2026-11-10"));
    await removeEdition(store, "2026-11-10", "day");
    expect(await getEdition(store, "2026-11-10", "day")).toBeUndefined();
  });

  it("finds the most recent previous-day edition", async () => {
    const store = new FakeStore();
    await saveEdition(store, makeEdition("2026-11-08"));
    await saveEdition(store, makeEdition("2026-11-09"));
    await saveEdition(store, makeEdition("2026-11-10"));

    const latest = await getLatestEdition(store, "2026-11-10", "day");
    expect(latest?.date).toBe("2026-11-09");
  });
});

describe("prune", () => {
  it("keeps 7 days of history and drops older editions", async () => {
    const store = new FakeStore();
    for (const date of ["2026-11-10", "2026-11-09", "2026-11-03", "2026-11-02"]) {
      await saveEdition(store, makeEdition(date));
    }

    await pruneEditions(store, "2026-11-10");

    expect(await getEdition(store, "2026-11-10", "day")).toBeDefined();
    expect(await getEdition(store, "2026-11-09", "day")).toBeDefined();
    expect(await getEdition(store, "2026-11-03", "day")).toBeDefined();
    expect(await getEdition(store, "2026-11-02", "day")).toBeUndefined();
    expect(PRUNE_KEEP_DAYS).toBe(7);
  });

  it("leaves non-edition keys untouched", async () => {
    const store = new FakeStore();
    await store.set("reprint:2026-11-10", true);
    await pruneEditions(store, "2026-11-10");
    expect(await store.get("reprint:2026-11-10")).toBe(true);
  });
});

describe("reprint limit", () => {
  it("allows one reprint per day", async () => {
    const store = new FakeStore();
    expect(await canReprint(store, "2026-11-10")).toBe(true);
    await markReprint(store, "2026-11-10");
    expect(await canReprint(store, "2026-11-10")).toBe(false);
    expect(await canReprint(store, "2026-11-11")).toBe(true);
  });
});
