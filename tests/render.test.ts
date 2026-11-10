import { beforeEach, describe, expect, it, vi } from "vitest";
import { arrangeImagesFirst, mountRoot, render, ROOT_ID } from "../src/core/render";
import { PAPER } from "../src/shared/config";
import type { FeedItem, PaperCopy } from "../src/shared/types";

const COPY: PaperCopy = {
  tagline: "Test tagline",
  membership: "Test tier",
  loading: "Loading test",
  empty: "No items in test",
  end: "Test end.",
  closeLabel: "Close test",
  stale: "Stale test",
  reprint: "Reprint test",
  reprintLimited: "Limit test",
};

const makeItem = (n: number, overrides: Partial<FeedItem> = {}): FeedItem => ({
  key: `autor|texto-${n}`,
  author: `Autor ${n}`,
  timestamp: "3 de noviembre de 2026 a las 10:30",
  ts: 1790000000000 - n,
  text: `Titular ${n}\nCuerpo de la nota ${n}.`,
  headline: `Titular ${n}`,
  imageUrl: `https://cdn.example.com/${n}.jpg`,
  ...overrides,
});

describe("render (front page structure)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.className = "";
  });

  it("renders masthead, hero, secondaries, briefs and footer", () => {
    const items = Array.from({ length: 6 }, (_, i) => makeItem(i));
    const root = mountRoot();
    render(items, root, PAPER, COPY);

    expect(document.getElementById(ROOT_ID)).toBe(root);
    expect(root.querySelector(".fp-name")!.textContent).toBe("Foco Diario");
    expect(root.querySelector(".fp-tagline")!.textContent).toBe("Test tagline");
    expect(root.querySelector(".fp-url")!.getAttribute("href")).toBe(
      "https://focodiario.consultores-tic.com"
    );
    expect(root.querySelector(".fp-date")!.textContent).toBeTruthy();
    expect(root.querySelector(".fp-membership")!.textContent).toBe("Test tier");

    const cards = root.querySelectorAll(".fp-items > .fp-item");
    expect(cards).toHaveLength(6);
    expect(cards[0]!.classList.contains("fp-item--hero")).toBe(true);
    expect(cards[1]!.classList.contains("fp-item--wide")).toBe(true);
    expect(cards[2]!.classList.contains("fp-item--wide")).toBe(true);
    expect(cards[3]!.classList.contains("fp-item--brief")).toBe(true);

    expect(root.querySelector(".fp-end")!.textContent).toBe("Test end.");
  });

  it("shows photos only on the first three slots", () => {
    const items = Array.from({ length: 4 }, (_, i) => makeItem(i));
    const root = mountRoot();
    render(items, root, PAPER, COPY);

    const cards = root.querySelectorAll(".fp-items > .fp-item");
    expect(cards[0]!.querySelector("img.fp-photo")).not.toBeNull();
    expect(cards[1]!.querySelector("img.fp-photo")).not.toBeNull();
    expect(cards[2]!.querySelector("img.fp-photo")).not.toBeNull();
    expect(cards[3]!.querySelector("img.fp-photo")).toBeNull();
  });

  it("renders the fail-closed empty state without a grid", () => {
    const root = mountRoot();
    render([], root, PAPER, COPY);

    expect(root.querySelector(".fp-empty")!.textContent).toBe(
      "No items in test"
    );
    expect(root.querySelector(".fp-items")).toBeNull();
    expect(root.querySelector(".fp-end")).toBeNull();
  });

  it("opens the detail lightbox on click and closes with Escape", () => {
    const [item] = [makeItem(0, { text: "Cuerpo completo del post." })];
    const root = mountRoot();
    render([item], root, PAPER, COPY);

    const hero = root.querySelector<HTMLElement>(".fp-item--hero")!;
    hero.click();

    const lb = root.querySelector<HTMLElement>(".fp-lightbox")!;
    expect(lb.hidden).toBe(false);
    expect(
      lb.querySelector(".fp-lightbox-close")!.getAttribute("aria-label")
    ).toBe("Close test");
    expect(lb.querySelector(".fp-lb-headline")!.textContent).toBe("Titular 0");
    expect(lb.querySelector(".fp-lb-body")!.textContent).toBe(
      "Cuerpo completo del post."
    );
    expect(lb.querySelector<HTMLImageElement>(".fp-lb-photo")!.hidden).toBe(
      false
    );

    lb.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(lb.hidden).toBe(true);
    expect(root.classList.contains("fp-lb-open")).toBe(false);
  });

  it("does not repeat the body when it equals the headline", () => {
    const root = mountRoot();
    render([makeItem(0, { headline: "Igual", text: "igual" })], root, PAPER, COPY);
    expect(root.querySelector(".fp-body")).toBeNull();
  });

  it("shows the stale notice only when requested", () => {
    const root = mountRoot();
    render([makeItem(0)], root, PAPER, COPY, { stale: true });
    expect(root.querySelector(".fp-stale")!.textContent).toBe("Stale test");

    render([makeItem(0)], root, PAPER, COPY);
    expect(root.querySelector(".fp-stale")).toBeNull();
  });

  it("wires the manual reprint action", () => {
    const onReprint = vi.fn();
    const root = mountRoot();
    render([makeItem(0)], root, PAPER, COPY, { onReprint });

    const btn = root.querySelector<HTMLButtonElement>(".fp-reprint")!;
    expect(btn.textContent).toBe("Reprint test");
    btn.click();
    expect(onReprint).toHaveBeenCalledOnce();
  });
});

describe("arrangeImagesFirst", () => {
  it("promotes the first items with an image to the front", () => {
    const items = [
      makeItem(1, { imageUrl: null }),
      makeItem(2),
      makeItem(3, { imageUrl: null }),
      makeItem(4),
    ];
    const out = arrangeImagesFirst(items, 2);
    expect(out.slice(0, 2).map((i) => i.key)).toEqual(["autor|texto-2", "autor|texto-4"]);
    expect(out).toHaveLength(4);
  });

  it("is a no-op when the first items already have images", () => {
    const items = [makeItem(1), makeItem(2), makeItem(3)];
    expect(arrangeImagesFirst(items, 2).map((i) => i.key)).toEqual(
      items.map((i) => i.key)
    );
  });
});
