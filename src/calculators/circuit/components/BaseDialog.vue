<script setup>
import { ref } from "vue";
import { useDialogLayer } from "../../../composables/useDialogLayer.js";

defineProps({
    title: { type: String, required: true },
    size: { type: String, default: "medium" },
    labelledBy: { type: String, default: "dialog-title" },
    region: { type: String, default: null }
});

const emit = defineEmits(["close"]);
const dialog = ref(null);
useDialogLayer({
    dialog,
    onEscape: () => emit("close")
});
</script>

<template>
    <Teleport to="body">
        <div class="circuit-overlay-scope">
            <div :class="region ? `region-${region}` : undefined">
                <div class="modal-overlay" @mousedown.self="emit('close')">
                    <section
                        ref="dialog"
                        class="dialog-panel"
                        :class="`dialog-panel--${size}`"
                        role="dialog"
                        aria-modal="true"
                        tabindex="-1"
                        :aria-labelledby="labelledBy"
                    >
                        <header class="dialog-header">
                            <div>
                                <h2 :id="labelledBy">{{ title }}</h2>
                            </div>
                            <button class="dialog-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
                        </header>
                        <div class="dialog-body"><slot></slot></div>
                        <footer v-if="$slots.footer" class="dialog-footer"><slot name="footer"></slot></footer>
                    </section>
                </div>
            </div>
        </div>
    </Teleport>
</template>
