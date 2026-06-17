"use client";

type Theme = "light" | "dark";

const STORAGE_KEY = "finance-tracker:theme";

function getInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={() => {
        const currentTheme = getInitialTheme();
        const themeToApply = currentTheme === "dark" ? "light" : "dark";
        applyTheme(themeToApply);
      }}
      className="fixed right-4 top-4 z-50 grid size-9 place-items-center rounded-sm border border-hairline bg-canvas text-body shadow-card hover:bg-canvas-soft-2 hover:text-ink sm:right-6 sm:top-6"
    >
      <svg
        aria-hidden="true"
        className="theme-toggle-sun size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
      <svg
        aria-hidden="true"
        className="theme-toggle-moon hidden size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.99 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.78 9.79Z" />
      </svg>
    </button>
  );
}
