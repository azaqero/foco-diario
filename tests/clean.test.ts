import { describe, expect, it } from "vitest";
import {
  cleanBody,
  cleanText,
  clampHeadline,
  dedupeRepeat,
  deshout,
  firstSentence,
  isShouty,
  normalizeTitle,
  normalizeUnicode,
  stripCtas,
  stripHashtags,
  stripUrls,
  tidyText,
} from "../src/core/clean";

describe("normalizeUnicode", () => {
  it("folds decorative math letters into ASCII, keeping accents", () => {
    expect(normalizeUnicode("𝐂𝐎𝐍𝐅𝐄𝐒𝐈Ó𝐍")).toBe("CONFESIÓN");
    expect(normalizeUnicode("𝓗𝓸𝓵𝓪")).toBe("Hola");
  });
});

describe("cleanText", () => {
  it("removes the trailing see-more toggle", () => {
    expect(cleanText("Texto completo… Ver más")).toBe("Texto completo");
    expect(cleanText("Text… See more")).toBe("Text");
  });

  it("removes the see-less toggle too", () => {
    expect(cleanText("Texto completo Ver menos")).toBe("Texto completo");
    expect(cleanText("Text See less")).toBe("Text");
  });

  it("keeps text that merely mentions the words", () => {
    expect(cleanText("Ver más tarde es una opción")).toBe(
      "Ver más tarde es una opción"
    );
  });
});

describe("stripUrls", () => {
  it("removes URLs with scheme", () => {
    expect(stripUrls("Mira https://example.com/nota?id=1 ahora")).toBe(
      "Mira ahora"
    );
  });

  it("removes bare domains and paths", () => {
    expect(stripUrls("Fuente: ptv.pe/477229 y sigue")).toBe("Fuente: y sigue");
  });

  it("does not remove normal sentences with a period", () => {
    expect(stripUrls("El precio subió 3.8% este mes")).toBe(
      "El precio subió 3.8% este mes"
    );
  });
});

describe("tidyText", () => {
  it("removes stray pipes and markdown asterisks", () => {
    expect(tidyText("Título | *importante*")).toBe("Título importante");
  });

  it("removes odd leading punctuation", () => {
    expect(tidyText(": *¡Alerta!")).toBe("¡Alerta!");
  });

  it("adds a space after sentence punctuation glued to a word", () => {
    expect(tidyText("El sector.El gobierno")).toBe("El sector. El gobierno");
    expect(tidyText("Hola,qué tal?")).toBe("Hola, qué tal?");
  });

  it("does not split decimals", () => {
    expect(tidyText("Crecimiento de 3.8% anual")).toBe("Crecimiento de 3.8% anual");
  });
});

describe("stripCtas", () => {
  it("removes known calls to action", () => {
    expect(stripCtas("Lee la nota completa: El resto del texto")).toBe(
      "El resto del texto"
    );
    expect(stripCtas("Entérate más en La Noticia Punto Com")).toBe("");
    expect(stripCtas("Más información en el primer comentario")).toBe("");
  });

  it("removes trailing engagement hooks", () => {
    expect(stripCtas("Una noticia importante. Conoce más")).toBe(
      "Una noticia importante."
    );
    expect(stripCtas("Una noticia importante en Whatsapp Telegram")).toBe(
      "Una noticia importante"
    );
    expect(stripCtas("Solo por hoy")).toBe("");
  });

  it("leaves clean text untouched", () => {
    expect(stripCtas("El congreso aprobó la ley.")).toBe(
      "El congreso aprobó la ley."
    );
  });
});

describe("dedupeRepeat", () => {
  it("collapses a duplicated block at the end", () => {
    expect(dedupeRepeat("Un título bastante largo Un título bastante largo")).toBe(
      "Un título bastante largo"
    );
  });

  it("does not touch a single short block", () => {
    expect(dedupeRepeat("Texto normal")).toBe("Texto normal");
  });
});

describe("stripHashtags", () => {
  it("removes hashtags from the middle and end", () => {
    expect(stripHashtags("Noticia #peru #economía de hoy")).toBe(
      "Noticia de hoy"
    );
  });
});

describe("isShouty", () => {
  it("detects mostly-uppercase text with several words", () => {
    expect(isShouty("LA CRUZ DE LOS ANDES")).toBe(true);
  });

  it("ignores a lone acronym", () => {
    expect(isShouty("BCP")).toBe(false);
  });

  it("ignores normal casing", () => {
    expect(isShouty("La cruz de los andes")).toBe(false);
  });
});

describe("deshout", () => {
  it("converts all-caps text to sentence case per sentence", () => {
    expect(deshout("LA CRUZ DE LOS ANDES. EL FIN")).toBe(
      "La cruz de los andes. El fin"
    );
  });

  it("lowers shouted runs in mixed text without touching lone capitals", () => {
    expect(deshout("La CRUZ DE LOS ANDES cayó")).toBe(
      "La cruz de los andes cayó"
    );
  });

  it("lowers a single shouted word but not acronyms", () => {
    expect(deshout("Un DOLOROSO caso")).toBe("Un doloroso caso");
    expect(deshout("El BCP subió")).toBe("El BCP subió");
  });

  it("preserves mixed-case text with proper names", () => {
    expect(deshout("El presidente de Perú habló")).toBe(
      "El presidente de Perú habló"
    );
  });
});

describe("firstSentence", () => {
  it("returns the first sentence with its closing punctuation", () => {
    expect(firstSentence("¡Aumento confirmado! El resto sigue")).toBe(
      "¡Aumento confirmado!"
    );
  });

  it("does not split a decimal number", () => {
    expect(firstSentence("La inflación subió 3.8% en marzo. El gobierno")).toBe(
      "La inflación subió 3.8% en marzo."
    );
  });
});

describe("clampHeadline", () => {
  it("cuts on a word boundary without ellipsis", () => {
    const out = clampHeadline(
      "Una noticia extremadamente larga que no entra completa",
      30
    );
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith("…")).toBe(false);
    expect(out).not.toMatch(/ $/);
  });

  it("never leaves a dangling connector", () => {
    expect(clampHeadline("Palabra palabra palabra de otra cosa", 27)).toBe(
      "Palabra palabra palabra"
    );
  });

  it("keeps short headlines intact", () => {
    expect(clampHeadline("Corto", 140)).toBe("Corto");
  });
});

describe("normalizeTitle", () => {
  it("turns an all-caps title into sentence case", () => {
    expect(normalizeTitle("LA CRUZ DE LOS ANDES")).toBe("La cruz de los andes");
  });

  it("preserves original casing when mixed", () => {
    expect(normalizeTitle("El BCP y Perú hoy")).toBe("El BCP y Perú hoy");
  });

  it("strips hashtags and returns empty when nothing remains", () => {
    expect(normalizeTitle("#solo #hashtags #aquí")).toBe("");
  });
});

describe("cleanBody (full pipeline)", () => {
  it("cleans a realistic noisy post", () => {
    const raw = [
      "𝐀𝐔𝐌𝐄𝐍𝐓𝐎 𝐃𝐄 𝐏𝐑𝐄𝐂𝐈𝐎𝐒 | El gobierno anunció hoy",
      "un alza del 3.8% en los combustibles https://example.com/nota",
      "Lee la nota completa:",
      "#economía #perú",
      "Ver más",
    ].join("\n");

    const out = cleanBody(raw);
    expect(out.startsWith("Aumento de precios")).toBe(true);
    expect(out).toContain("un alza del 3.8% en los combustibles");
    expect(out).not.toContain("https://");
    expect(out).not.toContain("#");
    expect(out).not.toContain("Ver más");
    expect(out).not.toContain("Lee la nota completa");
  });

  it("returns an empty string when only noise remains", () => {
    expect(cleanBody("Ver más")).toBe("");
    expect(cleanBody("#solo #hashtags")).toBe("");
  });
});
