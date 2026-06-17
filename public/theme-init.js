(() => {
  try {
    const stored = localStorage.getItem("finance-tracker:theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme =
      stored === "dark" || stored === "light"
        ? stored
        : systemDark
          ? "dark"
          : "light";

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
