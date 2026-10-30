import {
    nextTick,
    onActivated,
    onBeforeUnmount,
    onDeactivated,
    onMounted
} from "vue";

const dialogLayers = [];
const focusableSelector = [
    "button:not([disabled])",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    "a[href]",
    '[tabindex]:not([tabindex="-1"])'
].join(",");

function focusableElements(layer) {
    return [...(layer.dialog.value?.querySelectorAll(focusableSelector) ?? [])]
        .filter((element) => !element.closest('[hidden], [inert], [aria-hidden="true"]'));
}

function focusInitial(layer) {
    const target = layer.initialFocus?.value ?? focusableElements(layer)[0];
    (target ?? layer.dialog.value)?.focus();
}

function handleDialogKeydown(event) {
    const layer = dialogLayers.at(-1);
    if (!layer || event.defaultPrevented || event.isComposing) return;
    if (event.key === "Escape") {
        event.preventDefault();
        layer.onEscape();
        return;
    }
    if (event.key !== "Tab") return;

    const elements = focusableElements(layer);
    const first = elements[0];
    const last = elements.at(-1);
    if (!first) {
        event.preventDefault();
        layer.dialog.value?.focus();
        return;
    }
    const active = document.activeElement;
    if (!elements.includes(active)
        || (event.shiftKey && active === first)
        || (!event.shiftKey && active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    }
}

export function useDialogLayer({ dialog, initialFocus, onEscape }) {
    const layer = { dialog, initialFocus, onEscape, previousFocus: null };
    let registered = false;

    function register() {
        if (registered) return;
        registered = true;
        layer.previousFocus = document.activeElement;
        if (dialogLayers.length === 0) {
            document.body.classList.add("dialog-open");
            document.addEventListener("keydown", handleDialogKeydown);
        }
        dialogLayers.push(layer);
        void nextTick(() => {
            if (registered && dialogLayers.at(-1) === layer) focusInitial(layer);
        });
    }

    function unregister({ restoreFocus = true } = {}) {
        if (!registered) return;
        registered = false;
        const index = dialogLayers.indexOf(layer);
        const wasTop = index === dialogLayers.length - 1;
        dialogLayers.splice(index, 1);
        if (dialogLayers.length === 0) {
            document.body.classList.remove("dialog-open");
            document.removeEventListener("keydown", handleDialogKeydown);
        }
        if (!wasTop || !restoreFocus) return;

        const nextLayer = dialogLayers.at(-1);
        const previous = layer.previousFocus;
        if (previous?.isConnected
            && (!nextLayer || nextLayer.dialog.value?.contains(previous))) {
            previous.focus();
        } else if (nextLayer) {
            focusInitial(nextLayer);
        }
    }

    onMounted(register);
    onActivated(register);
    onDeactivated(() => unregister({ restoreFocus: false }));
    onBeforeUnmount(unregister);
}
