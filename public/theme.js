(function applyInitialTheme() {
    const storageKey = "efsim-color-theme";
    let storedTheme = null;
    try {
        const candidate = localStorage.getItem(storageKey);
        if (candidate === "light" || candidate === "dark") {
            storedTheme = candidate;
        }
    } catch {
        storedTheme = null;
    }
    const prefersDark = window.matchMedia
        && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === "dark"
        ? "#070b0e"
        : "#eef2f5";
}());
