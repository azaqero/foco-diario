import type { PaperCopy } from "./types";

/**
 * Fallback strings in the product's primary language (Spanish). Used by tests and
 * when the browser i18n API is unavailable. Real locales live in
 * `public/_locales/<locale>/messages.json`.
 */
export const DEFAULT_COPY: PaperCopy = {
  tagline: "Tu feed en calma, sin la dopamina del scroll.",
  membership: "Gratis",
  loading: "Cargando edición…",
  empty: "0 items extraídos. Verifica los selectores o recarga con el feed cargado.",
  end: "Fin del diario.",
  closeLabel: "Cerrar",
  stale: "Edición anterior: no se pudo actualizar el diario.",
  reprint: "Reimprimir edición",
  reprintLimited: "Ya reimprimiste hoy. Vuelve mañana.",
};
