/**
 * Renderer: the paper front page and its detail lightbox.
 * Builds DOM only; all styling lives in paper.css.
 */
import { PAPER } from "../shared/config";
import { DEFAULT_COPY } from "../shared/copy";
import type { FeedItem, PaperConfig, PaperCopy } from "../shared/types";

export const ROOT_ID = "focus-paper-root";

/** Returns (and mounts once) the paper root element. */
export function mountRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

const fmtDate = (d: Date): string =>
  d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/**
 * Promotes the first `n` items WITH an image to the front, preserving the
 * relative order of the rest. No-op when the first items already have images.
 */
export function arrangeImagesFirst(items: FeedItem[], n: number): FeedItem[] {
  const promoted = items.filter((it) => it.imageUrl).slice(0, n);
  const rest = items.filter((it) => !promoted.includes(it));
  return promoted.concat(rest);
}

// --- Lightbox: post detail -------------------------------------------------
let lightboxEl: HTMLElement | null = null;
let lightboxLastFocus: Element | null = null;

function ensureLightbox(root: HTMLElement, copy: PaperCopy): HTMLElement {
  if (lightboxEl && lightboxEl.parentElement === root) return lightboxEl;

  lightboxEl = document.createElement("div");
  lightboxEl.className = "fp-lightbox";
  lightboxEl.setAttribute("role", "dialog");
  lightboxEl.setAttribute("aria-modal", "true");
  lightboxEl.setAttribute("aria-labelledby", "fp-lb-title");
  lightboxEl.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "fp-lightbox-backdrop";

  const panel = document.createElement("article");
  panel.className = "fp-lightbox-panel";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "fp-lightbox-close";
  close.setAttribute("aria-label", copy.closeLabel);
  close.textContent = "\u00d7"; // ×

  const h = document.createElement("h2");
  h.className = "fp-lb-headline";
  h.id = "fp-lb-title";

  const by = document.createElement("div");
  by.className = "fp-lb-byline";

  const img = document.createElement("img");
  img.className = "fp-lb-photo";
  img.alt = "";
  img.hidden = true;
  img.addEventListener("error", () => {
    img.hidden = true;
  });

  const body = document.createElement("p");
  body.className = "fp-lb-body";

  panel.append(close, h, by, img, body);
  lightboxEl.append(backdrop, panel);

  backdrop.addEventListener("click", closeLightbox);
  close.addEventListener("click", closeLightbox);
  lightboxEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === "Tab") {
      // only focusable element inside the dialog: the close button
      e.preventDefault();
      close.focus();
    }
  });

  root.appendChild(lightboxEl);
  return lightboxEl;
}

function openLightbox(it: FeedItem, root: HTMLElement, copy: PaperCopy): void {
  const lb = ensureLightbox(root, copy);
  lb.querySelector(".fp-lb-headline")!.textContent = it.headline;
  lb.querySelector(".fp-lb-byline")!.textContent = [it.author, it.timestamp]
    .filter(Boolean)
    .join(" · ");

  const img = lb.querySelector<HTMLImageElement>(".fp-lb-photo")!;
  if (it.imageUrl) {
    img.src = it.imageUrl;
    img.hidden = false;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
  }

  lb.querySelector(".fp-lb-body")!.textContent = it.text;

  lightboxLastFocus = document.activeElement;
  lb.hidden = false;
  root.classList.add("fp-lb-open");
  lb.querySelector<HTMLElement>(".fp-lightbox-close")!.focus();
}

function closeLightbox(): void {
  if (!lightboxEl || lightboxEl.hidden) return;
  lightboxEl.hidden = true;
  const root = document.getElementById(ROOT_ID);
  if (root) root.classList.remove("fp-lb-open");
  if (lightboxLastFocus && "focus" in lightboxLastFocus) {
    (lightboxLastFocus as HTMLElement).focus();
  }
  lightboxLastFocus = null;
}

/** Optional render extras; keeps the renderer pure (callbacks, no storage). */
export interface RenderOptions {
  /** Shows the "previous edition" notice above the grid. */
  stale?: boolean;
  /** Provides the manual reprint action in the footer. */
  onReprint?: () => void;
}

function appendActions(
  root: HTMLElement,
  copy: PaperCopy,
  onReprint?: () => void
): void {
  if (!onReprint) return;
  const actions = document.createElement("div");
  actions.className = "fp-actions";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fp-reprint";
  btn.textContent = copy.reprint;
  btn.addEventListener("click", onReprint);
  actions.appendChild(btn);
  root.appendChild(actions);
}

/** Renders the front page into `root`. Empty input renders the fail-closed state. */
export function render(
  items: FeedItem[],
  root: HTMLElement,
  config: PaperConfig = PAPER,
  copy: PaperCopy = DEFAULT_COPY,
  options: RenderOptions = {}
): void {
  lightboxEl = null;
  root.classList.remove("fp-lb-open");
  root.innerHTML = "";

  const mast = document.createElement("header");
  mast.className = "fp-masthead";

  const name = document.createElement("h1");
  name.className = "fp-name";
  name.textContent = config.appName;

  // row: URL on the left, tagline centered on the same line
  const subrow = document.createElement("div");
  subrow.className = "fp-subrow";

  const url = document.createElement("a");
  url.className = "fp-url";
  url.textContent = config.projectUrl.replace(/^https?:\/\//i, "");
  url.href = /^https?:\/\//i.test(config.projectUrl)
    ? config.projectUrl
    : `https://${config.projectUrl}`;
  url.target = "_blank";
  url.rel = "noopener noreferrer";

  const tagline = document.createElement("p");
  tagline.className = "fp-tagline";
  tagline.textContent = copy.tagline;

  const spacer = document.createElement("span");
  spacer.className = "fp-subrow-spacer";
  spacer.setAttribute("aria-hidden", "true");

  subrow.append(url, tagline, spacer);

  // bottom row: date + membership (centered)
  const meta = document.createElement("div");
  meta.className = "fp-meta";
  const date = document.createElement("span");
  date.className = "fp-date";
  date.textContent = fmtDate(new Date());
  const sep = document.createElement("span");
  sep.className = "fp-meta-sep";
  sep.textContent = "·";
  sep.setAttribute("aria-hidden", "true");
  const membership = document.createElement("span");
  membership.className = "fp-membership";
  membership.textContent = copy.membership;
  meta.append(date, sep, membership);

  mast.append(name, subrow, meta);
  root.appendChild(mast);

  if (options.stale) {
    const stale = document.createElement("p");
    stale.className = "fp-stale";
    stale.textContent = copy.stale;
    root.appendChild(stale);
  }

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "fp-empty";
    empty.textContent = copy.empty;
    root.appendChild(empty);
    appendActions(root, copy, options.onReprint);
    return;
  }

  const main = document.createElement("main");
  main.className = "fp-items";
  items.forEach((it, idx) => {
    const art = document.createElement("article");
    art.className =
      "fp-item " +
      (idx === 0 ? "fp-item--hero" : idx <= 2 ? "fp-item--wide" : "fp-item--brief");

    // open the detail lightbox (mouse and keyboard)
    art.tabIndex = 0;
    art.setAttribute("role", "button");
    art.setAttribute("aria-haspopup", "dialog");
    const open = () => openLightbox(it, root, copy);
    art.addEventListener("click", open);
    art.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    const h = document.createElement("h2");
    h.className = "fp-headline";
    h.textContent = it.headline;
    art.appendChild(h);

    const by = document.createElement("div");
    by.className = "fp-byline";
    by.textContent = it.author || "";
    art.appendChild(by);

    // image only on hero (0) and secondary (1-2) slots; briefs never show one
    if (it.imageUrl && idx <= 2) {
      const img = document.createElement("img");
      img.className = "fp-photo";
      img.src = it.imageUrl;
      img.alt = "";
      img.loading = "lazy";
      // Cached image URLs are signed and expire: drop the broken photo, keep the item.
      img.addEventListener("error", () => img.remove());
      art.appendChild(img);
    }

    // skip the body when it is identical to the headline (ignoring case)
    const sameAsHeadline =
      it.text && it.text.trim().toLowerCase() === it.headline.trim().toLowerCase();
    if (it.text && !sameAsHeadline) {
      const body = document.createElement("p");
      body.className = "fp-body";
      body.textContent = it.text;
      art.appendChild(body);
    }

    main.appendChild(art);
  });
  root.appendChild(main);

  const end = document.createElement("footer");
  end.className = "fp-end";
  end.textContent = copy.end;
  root.appendChild(end);

  appendActions(root, copy, options.onReprint);
}
