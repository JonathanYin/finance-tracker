import type { Category } from "./types";

export const CATEGORIES: readonly Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Travel",
  "Other",
] as const;

/**
 * Restrained `badge-secondary` chrome per DESIGN.md — canvas-soft fill, body
 * text, hairline ring, pill radius. The brand forbids a sixth accent color, so
 * categories are distinguished by their label, not by hue.
 */
export const BADGE_CLASS =
  "rounded-full border border-hairline bg-canvas-soft text-body";
