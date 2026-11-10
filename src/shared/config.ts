import type { PaperConfig } from "./types";

/** Editorial identity of the paper. The final app name is still pending. */
export const PAPER: PaperConfig = {
  appName: "Foco Diario",
  projectUrl: "https://focodiario.consultores-tic.com",
  headlineMax: 140, // headline ceiling (word-boundary cut, no ellipsis)
  minImages: 3, // the first 3 items must render with a photo
};

/**
 * How many items fit the grid at a given viewport width.
 * 4 columns -> 11 (2x2 hero + 2 wide + 8 briefs with no gap), 2 columns -> 8, 1 -> 4.
 */
export function maxItemsForWidth(width: number): number {
  if (width > 900) return 11;
  if (width > 640) return 8;
  return 4;
}
