import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface MessageEntry {
  message: string;
}
type Catalog = Record<string, MessageEntry>;

const read = (locale: string): Catalog =>
  JSON.parse(
    readFileSync(`public/_locales/${locale}/messages.json`, "utf8")
  ) as Catalog;

const REQUIRED_KEYS = [
  "extName",
  "extDescription",
  "paperTagline",
  "paperMembership",
  "paperLoading",
  "paperEmpty",
  "paperEnd",
  "lightboxClose",
  "paperStale",
  "paperReprint",
  "paperReprintLimited",
  "optionsTitle",
  "optionsPending",
];

describe("i18n catalogs", () => {
  const es = read("es");
  const en = read("en");

  it("ship every required key", () => {
    for (const locale of [es, en]) {
      for (const key of REQUIRED_KEYS) {
        expect(locale[key], key).toBeDefined();
      }
    }
  });

  it("keep the same key set in every locale", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it("have no empty messages", () => {
    for (const catalog of [es, en]) {
      for (const [key, entry] of Object.entries(catalog)) {
        expect(entry.message.trim(), key).not.toBe("");
      }
    }
  });
});
