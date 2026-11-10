import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Public copy and docs use neutral, professional Spanish. Regional verb forms
 * and slang (Rioplatense/Argentine) are not allowed. Facebook content patterns
 * in src/core/clean.ts and src/core/extract.ts are data, not voice, so they are
 * intentionally excluded.
 */
const REGIONAL = new RegExp(
  String.raw`(?<![\p{L}])(tenés|tenes|podés|podes|querés|queres|sabés|hacés|sos|llegás|andá|mirá|fijate|acordate|asegurate|quedate|elegí|abrí|recargá|descargá|descomprimí|descomprimilo|probá|usá|dejá|poné|hacé|decime|escribí|comprá|seguí|vení|acá|dale|che|plata|laburo|laburar|posta|boludo|quilombo|guita|chamba)(?![\p{L}])`,
  "iu"
);

const FILES = [
  "README.md",
  "CONTRIBUTING.md",
  "docs/dev.md",
  "src/shared/copy.ts",
  "public/_locales/es/messages.json",
  "public/_locales/en/messages.json",
];

describe("public copy style", () => {
  it("uses neutral Spanish without regional verb forms or slang", () => {
    for (const file of FILES) {
      const text = readFileSync(file, "utf8");
      const match = text.match(REGIONAL);
      expect(match?.[0] ?? null, `${file}: "${match?.[0] ?? ""}"`).toBeNull();
    }
  });
});
