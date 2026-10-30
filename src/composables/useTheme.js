import { computed, ref } from "vue";

export const THEME_STORAGE_KEY = "efsim-color-theme";
export const THEME_COLORS = Object.freeze({
    light: "#eef2f5",
    dark: "#070b0e"
});

function isTheme(value) {
    return value === "light" || value === "dark";
}

function getDefaultStorage() {
    try {
        return typeof window === "undefined" ? null : window.localStorage;
    } catch {
        return null;
    }
}

function getDefaultMediaQuery() {
    try {
        return typeof window === "undefined" || !window.matchMedia
            ? null
            : window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
        return null;
    }
}

function applyTheme(theme, root, themeColorMeta) {
    if (root) {
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
    }
    themeColorMeta?.setAttribute("content", THEME_COLORS[theme]);
}

export function useTheme({
    root = typeof document === "undefined" ? null : document.documentElement,
    storage = getDefaultStorage(),
    mediaQuery = getDefaultMediaQuery(),
    themeColorMeta = typeof document === "undefined"
        ? null
        : document.querySelector('meta[name="theme-color"]')
} = {}) {
    let followsSystem = false;
    let storedTheme = null;
    try {
        storedTheme = storage?.getItem(THEME_STORAGE_KEY) ?? null;
    } catch {
        storedTheme = null;
    }
    const preAppliedTheme = isTheme(root?.dataset?.theme)
        ? root.dataset.theme
        : null;
    followsSystem = !isTheme(storedTheme);
    const theme = ref(isTheme(storedTheme) ? storedTheme : (
        preAppliedTheme ?? (mediaQuery?.matches ? "dark" : "light")
    ));

    applyTheme(theme.value, root, themeColorMeta);

    function handleSystemThemeChange(event) {
        if (!followsSystem) {
            return;
        }
        theme.value = event.matches ? "dark" : "light";
        applyTheme(theme.value, root, themeColorMeta);
    }

    mediaQuery?.addEventListener?.("change", handleSystemThemeChange);

    function toggleTheme() {
        followsSystem = false;
        theme.value = theme.value === "dark" ? "light" : "dark";
        applyTheme(theme.value, root, themeColorMeta);
        try {
            storage?.setItem(THEME_STORAGE_KEY, theme.value);
        } catch {
        }
    }

    function dispose() {
        mediaQuery?.removeEventListener?.("change", handleSystemThemeChange);
    }

    return {
        theme,
        isDark: computed(() => theme.value === "dark"),
        toggleTheme,
        dispose
    };
}
