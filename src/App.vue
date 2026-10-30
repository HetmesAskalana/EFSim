<script setup>
import {
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref
} from "vue";
import {
    CALCULATORS,
    findCalculator,
    preloadCalculator
} from "./calculators/index.js";
import CalculatorTabs from "./components/CalculatorTabs.vue";
import { useTheme } from "./composables/useTheme.js";

const calculators = CALCULATORS;

function idFromHash() {
    if (typeof window === "undefined") {
        return null;
    }
    const hashValue = window.location.hash.replace(/^#/, "").trim();
    const normalizedHash = hashValue.toUpperCase();
    const directCalculator = calculators.find((calculator) => (
        calculator.hash === normalizedHash
        || calculator.shortLabel === normalizedHash
    ));
    if (directCalculator) {
        return directCalculator.id;
    }

    const legacyId = hashValue.replace(/^tool\//i, "").toLowerCase();
    return findCalculator(legacyId)?.id ?? null;
}

const activeId = ref(idFromHash() ?? calculators[0].id);
const themeController = useTheme();
const mobileMenuOpen = ref(false);
const mobileMenuButton = ref(null);
const mobileMenuPanel = ref(null);
const switchDirection = ref("forward");
const switchSource = ref("location");
const switchAnnouncement = ref("");
let cancelScheduledPreload = null;
let mobileViewportQuery = null;
let switchAnnouncementTimer = null;

function openMobileMenu() {
    if (document.body.classList.contains("dialog-open")) {
        return;
    }
    mobileMenuOpen.value = true;
    document.body.classList.add("mobile-menu-open");
    void nextTick(() => {
        mobileMenuPanel.value?.focus();
    });
}

function closeMobileMenu({ restoreFocus = true } = {}) {
    if (!mobileMenuOpen.value) {
        return;
    }
    mobileMenuOpen.value = false;
    document.body.classList.remove("mobile-menu-open");
    if (restoreFocus) {
        void nextTick(() => mobileMenuButton.value?.focus());
    }
}

function toggleMobileMenu() {
    if (mobileMenuOpen.value) {
        closeMobileMenu();
        return;
    }
    openMobileMenu();
}

function selectFromMobileMenu(id) {
    const changed = selectCalculator(id, { scrollOnMobile: true, source: "menu" });
    closeMobileMenu();
    if (!changed) {
        mobileMenuButton.value?.focus();
    }
}

function handleMobileMenuKeydown(event) {
    if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMenu();
        return;
    }
    if (event.key !== "Tab") {
        return;
    }

    const focusable = [...(mobileMenuPanel.value?.querySelectorAll(
        "button:not([disabled])"
    ) ?? [])];
    if (focusable.length === 0) {
        return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    const panelHasFocus = document.activeElement === mobileMenuPanel.value;
    if (event.shiftKey && (document.activeElement === first || panelHasFocus)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || panelHasFocus)) {
        event.preventDefault();
        first.focus();
    }
}

function handleMobileViewportChange(event) {
    if (!event.matches) {
        closeMobileMenu({ restoreFocus: false });
    }
}

function scheduleInactivePreload() {
    const preload = () => {
        cancelScheduledPreload = null;
        void Promise.allSettled(calculators
            .filter((calculator) => calculator.id !== activeId.value)
            .map((calculator) => preloadCalculator(calculator.id)));
    };

    if (typeof window.requestIdleCallback === "function") {
        const handle = window.requestIdleCallback(preload, { timeout: 1200 });
        cancelScheduledPreload = () => window.cancelIdleCallback?.(handle);
        return;
    }

    const handle = window.setTimeout(preload, 120);
    cancelScheduledPreload = () => window.clearTimeout(handle);
}

function announceSwitch(message) {
    switchAnnouncement.value = message;
    if (switchAnnouncementTimer !== null) {
        window.clearTimeout(switchAnnouncementTimer);
    }
    switchAnnouncementTimer = window.setTimeout(() => {
        switchAnnouncement.value = "";
        switchAnnouncementTimer = null;
    }, 1400);
}

function scrollToActivePanel(id, { immediate = false } = {}) {
    void nextTick(() => {
        if (id !== activeId.value) {
            return;
        }
        const isMobile = mobileViewportQuery?.matches
            ?? window.matchMedia?.("(max-width: 760px)")?.matches
            ?? false;
        if (!isMobile) {
            return;
        }
        const panel = document.getElementById(`calculator-panel-${id}`);
        const header = document.querySelector(".site-header");
        if (!panel) {
            return;
        }
        const top = panel.getBoundingClientRect().top
            + window.scrollY
            - (header?.offsetHeight ?? 0);
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")
            ?.matches ?? false;
        window.scrollTo?.({
            top: Math.max(0, Math.round(top)),
            behavior: immediate || reducedMotion ? "auto" : "smooth"
        });
    });
}

function selectCalculator(id, { scrollOnMobile = false, source = "tab" } = {}) {
    const calculator = findCalculator(id);
    if (!calculator) {
        return false;
    }
    if (document.body.classList.contains("dialog-open")) {
        announceSwitch("请先关闭当前弹窗，再切换玩法");
        return false;
    }
    if (id === activeId.value) {
        return false;
    }

    const previousIndex = calculators.findIndex((item) => item.id === activeId.value);
    const nextIndex = calculators.findIndex((item) => item.id === id);
    switchDirection.value = nextIndex >= previousIndex ? "forward" : "backward";
    switchSource.value = source;
    void preloadCalculator(id).catch(() => null);
    activeId.value = id;
    if (source !== "location") {
        window.history.pushState(null, "", `#${calculator.hash}`);
    }
    announceSwitch(`已切换到${calculator.label}`);
    if (scrollOnMobile) {
        scrollToActivePanel(id, { immediate: source === "menu" });
    }
    return true;
}

function preloadOnIntent(id) {
    void preloadCalculator(id).catch(() => null);
}

function handleLocationChange() {
    const requestedId = idFromHash() ?? calculators[0].id;
    if (document.body.classList.contains("dialog-open")) {
        return;
    }
    selectCalculator(requestedId, { source: "location" });
}

onMounted(() => {
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    mobileViewportQuery = window.matchMedia?.("(max-width: 760px)") ?? null;
    mobileViewportQuery?.addEventListener?.("change", handleMobileViewportChange);
    scheduleInactivePreload();
});

onBeforeUnmount(() => {
    cancelScheduledPreload?.();
    if (switchAnnouncementTimer !== null) {
        window.clearTimeout(switchAnnouncementTimer);
    }
    document.body.classList.remove("mobile-menu-open");
    window.removeEventListener("hashchange", handleLocationChange);
    window.removeEventListener("popstate", handleLocationChange);
    mobileViewportQuery?.removeEventListener?.("change", handleMobileViewportChange);
    themeController.dispose();
});
</script>

<template>
    <div class="site-shell" :inert="mobileMenuOpen || undefined">
        <header class="site-header">
            <h1>终末地解密计算器</h1>

            <CalculatorTabs
                :calculators="calculators"
                :active-id="activeId"
                @select="selectCalculator"
                @preload="preloadOnIntent"
            />

            <button
                class="theme-toggle"
                type="button"
                :aria-label="themeController.theme.value === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
                :aria-pressed="themeController.theme.value === 'dark'"
                :title="themeController.theme.value === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
                data-testid="theme-toggle"
                @click="themeController.toggleTheme"
            >
                <svg
                    v-if="themeController.theme.value === 'dark'"
                    class="theme-toggle__icon theme-toggle__icon--sun"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="3.5"></circle>
                    <path d="M12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5"></path>
                    <path d="M5.3 5.3L7 7M17 17L18.7 18.7M18.7 5.3L17 7M7 17L5.3 18.7"></path>
                </svg>
                <svg
                    v-else
                    class="theme-toggle__icon theme-toggle__icon--moon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="M19.2 15.2A7.8 7.8 0 0 1 8.8 4.8A8.3 8.3 0 1 0 19.2 15.2Z"></path>
                </svg>
            </button>

            <button
                ref="mobileMenuButton"
                class="mobile-menu-toggle"
                type="button"
                aria-label="打开玩法菜单"
                aria-controls="mobile-tool-sidebar"
                :aria-expanded="mobileMenuOpen"
                @click="toggleMobileMenu"
            >
                <span class="mobile-menu-toggle__glyph" aria-hidden="true">
                    <span class="mobile-menu-toggle__tile"></span>
                    <span class="mobile-menu-toggle__tile"></span>
                    <span class="mobile-menu-toggle__tile"></span>
                </span>
                <span class="mobile-menu-toggle__hint">更多工具</span>
            </button>
        </header>

        <Teleport to="body">
            <Transition name="mobile-menu">
                <div
                    v-if="mobileMenuOpen"
                    class="mobile-menu-layer"
                    @click.self="closeMobileMenu()"
                >
                    <aside
                        id="mobile-tool-sidebar"
                        ref="mobileMenuPanel"
                        class="mobile-tool-sidebar"
                        role="dialog"
                        tabindex="-1"
                        aria-modal="true"
                        aria-labelledby="mobile-tool-sidebar-title"
                        @keydown="handleMobileMenuKeydown"
                    >
                        <header class="mobile-sidebar-header">
                            <div>
                                <span class="mobile-sidebar-eyebrow">TOOLS</span>
                                <h2 id="mobile-tool-sidebar-title">选择玩法</h2>
                            </div>
                            <button
                                class="mobile-sidebar-close"
                                type="button"
                                aria-label="关闭玩法菜单"
                                @click="closeMobileMenu()"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6L18 18M18 6L6 18"></path>
                                </svg>
                            </button>
                        </header>

                        <nav class="mobile-tool-list" aria-label="选择解密玩法">
                            <button
                                v-for="calculator in calculators"
                                :key="calculator.id"
                                class="mobile-tool-option"
                                :class="{
                                    'mobile-tool-option--active': calculator.id === activeId
                                }"
                                type="button"
                                :aria-current="calculator.id === activeId ? 'page' : undefined"
                                @pointerenter="preloadOnIntent(calculator.id)"
                                @focus="preloadOnIntent(calculator.id)"
                                @click="selectFromMobileMenu(calculator.id)"
                            >
                                <span
                                    class="mobile-tool-option__code"
                                    aria-hidden="true"
                                >
                                    {{ calculator.shortLabel }}
                                </span>
                                <span class="mobile-tool-option__label">
                                    {{ calculator.label }}
                                </span>
                                <span class="mobile-tool-option__arrow" aria-hidden="true">›</span>
                            </button>
                        </nav>

                        <footer class="mobile-sidebar-footer">
                            <button
                                class="mobile-theme-switch"
                                type="button"
                                role="switch"
                                :aria-checked="themeController.theme.value === 'dark'"
                                aria-label="深色模式"
                                data-testid="mobile-theme-switch"
                                @click="themeController.toggleTheme"
                            >
                                <span class="mobile-theme-switch__label">深色模式</span>
                                <span class="mobile-theme-switch__track" aria-hidden="true">
                                    <span class="mobile-theme-switch__thumb"></span>
                                </span>
                            </button>
                        </footer>
                    </aside>
                </div>
            </Transition>
        </Teleport>

        <main class="site-main">
            <p class="visually-hidden" role="status" aria-live="polite">
                {{ switchAnnouncement }}
            </p>
            <section
                v-for="calculator in calculators"
                v-show="calculator.id === activeId"
                :id="`calculator-panel-${calculator.id}`"
                :key="calculator.id"
                class="calculator-panel"
                :class="calculator.id === activeId
                    ? [
                        'calculator-panel--active',
                        `calculator-panel--${switchDirection}`,
                        `calculator-panel--from-${switchSource}`
                    ]
                    : undefined"
                :data-calculator="calculator.id"
                role="tabpanel"
                :aria-labelledby="`calculator-tab-${calculator.id}`"
                :aria-hidden="calculator.id === activeId ? undefined : 'true'"
                :inert="calculator.id !== activeId"
                :tabindex="calculator.id === activeId ? 0 : -1"
            >
                <KeepAlive>
                    <component
                        v-if="calculator.id === activeId"
                        :is="calculator.component"
                        :active="calculator.id === activeId"
                    />
                </KeepAlive>
            </section>
        </main>

        <footer class="site-footer">
            <strong>BY HETMES ASKALANA</strong>
        </footer>
    </div>
</template>
