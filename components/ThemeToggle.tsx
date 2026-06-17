"use client";

/**
 * Fixed top-right control that flips between light and dark.
 *
 * Stateless by design: the active theme lives on <html data-theme> (set before
 * paint by the inline script in layout.tsx and persisted to localStorage). On
 * click we read that attribute, flip it, and write it back. Both icons are
 * always rendered; CSS shows the right one per theme, so the markup matches
 * server and client and there's no hydration mismatch.
 */
export default function ThemeToggle() {
  const toggle = () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage unavailable (private mode / blocked) — theme still applies
      // for this session, it just won't persist.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-sm border border-hairline bg-canvas text-body shadow-card transition-colors hover:border-hairline-strong hover:text-ink"
    >
      {/* Shown in light mode — click to go dark */}
      <svg
        className="theme-icon-light"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {/* Shown in dark mode — click to go light */}
      <svg
        className="theme-icon-dark"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
