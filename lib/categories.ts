import type { Category, IncomeCategory, SavingsDestination } from "./types";

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

export const INCOME_CATEGORIES: readonly IncomeCategory[] = [
  "Salary",
  "Bonus",
  "Interest",
  "Other income",
] as const;

export const SAVINGS_DESTINATIONS: readonly SavingsDestination[] = [
  "Schwab",
  "Other savings",
] as const;

/**
 * Restrained `badge-secondary` chrome per DESIGN.md — canvas-soft fill, body
 * text, hairline ring, pill radius. The brand forbids a sixth accent color, so
 * categories are distinguished by their label, not by hue.
 */
export const BADGE_CLASS =
  "rounded-full border border-hairline bg-canvas-soft text-body";
