import { beforeEach, describe, expect, it } from "vitest";
import {
  extractItem,
  getAuthor,
  parseTimestamp,
  txt,
} from "../src/core/extract";
import { FACEBOOK_ADAPTER } from "../src/core/adapter/facebook";

const itemHtml = `
  <div aria-posinset="1" id="post">
    <div data-ad-rendering-role="profile_name"><h4>La República · Seguir</h4></div>
    <div data-ad-comet-preview="message">Título de la nota
Cuerpo con más texto sobre el tema.</div>
    <img data-imgperflogname="feedImage" src="https://cdn.example.com/foto.jpg" />
    <a aria-describedby="abs1" aria-labelledby="rel1"></a>
  </div>
  <div id="abs1">3 de noviembre de 2026 a las 10:30</div>
  <div id="rel1">3 de noviembre de 2026 a las 10:30</div>
`;

const extract = () =>
  extractItem(document.getElementById("post")!, FACEBOOK_ADAPTER, 140);

describe("getAuthor", () => {
  beforeEach(() => {
    document.body.innerHTML = itemHtml;
  });

  it("strips the follow button and verified tooltips", () => {
    expect(getAuthor(document.getElementById("post")!, FACEBOOK_ADAPTER)).toBe(
      "La República"
    );
  });
});

describe("parseTimestamp", () => {
  it("parses Spanish absolute dates", () => {
    const ts = parseTimestamp("3 de noviembre de 2026 a las 10:30");
    expect(new Date(ts).getFullYear()).toBe(2026);
    expect(new Date(ts).getMonth()).toBe(10);
    expect(new Date(ts).getDate()).toBe(3);
  });

  it("parses relative dates", () => {
    const ts = parseTimestamp("hace 2 horas");
    expect(ts).toBeGreaterThan(Date.now() - 3 * 60 * 60 * 1000);
    expect(ts).toBeLessThan(Date.now());
  });

  it("returns -1 for unknown labels", () => {
    expect(parseTimestamp("ayer a las 10:30")).toBe(-1);
    expect(parseTimestamp("")).toBe(-1);
  });
});

describe("extractItem", () => {
  beforeEach(() => {
    document.body.innerHTML = itemHtml;
  });

  it("extracts text, headline, author, timestamp and image", () => {
    const item = extract();
    expect(item).not.toBeNull();
    expect(item!.headline).toBe("Título de la nota");
    expect(item!.text).toContain("Cuerpo con más texto sobre el tema.");
    expect(item!.author).toBe("La República");
    expect(item!.imageUrl).toBe("https://cdn.example.com/foto.jpg");
    expect(item!.ts).toBeGreaterThan(0);
    expect(item!.key.startsWith("La República|")).toBe(true);
  });

  it("drops sponsored posts", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div data-ad-rendering-role="cta" id="ad"></div>'
    );
    document.getElementById("post")!.append(document.getElementById("ad")!);
    expect(extract()).toBeNull();
  });

  it("drops title-only cards", () => {
    document.querySelector('[data-ad-comet-preview="message"]')!.textContent =
      "Solo un título";
    expect(extract()).toBeNull();
  });

  it("drops posts without text", () => {
    document.querySelector('[data-ad-comet-preview="message"]')!.remove();
    expect(extract()).toBeNull();
  });

  it("uses the video poster when there is no feed image", () => {
    document.querySelector("img")!.remove();
    document.getElementById("post")!.insertAdjacentHTML(
      "beforeend",
      '<video poster="https://cdn.example.com/poster.jpg"></video>'
    );
    expect(extract()!.imageUrl).toBe("https://cdn.example.com/poster.jpg");
  });
});

describe("txt", () => {
  it("returns trimmed text or an empty string", () => {
    document.body.innerHTML = "<p>  hola  </p>";
    expect(txt(document.querySelector("p"))).toBe("hola");
    expect(txt(null)).toBe("");
  });
});
