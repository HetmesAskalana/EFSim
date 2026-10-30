<script setup>
import { ref } from "vue";
import { useDialogLayer } from "../../../composables/useDialogLayer.js";

defineProps({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    confirmLabel: {
        type: String,
        default: "确认"
    },
    tone: {
        type: String,
        default: "danger"
    }
});

const emit = defineEmits(["confirm", "cancel"]);
const cancelButton = ref(null);
const dialog = ref(null);
useDialogLayer({
    dialog,
    initialFocus: cancelButton,
    onEscape: () => emit("cancel")
});
</script>

<template>
    <Teleport to="body">
        <div class="floating-overlay-scope">
            <div
                class="modal-overlay"
                @mousedown.self="emit('cancel')"
            >
                <section
                    ref="dialog"
                    class="confirm-dialog"
                    :class="`confirm-dialog--${tone}`"
                    role="alertdialog"
                    aria-modal="true"
                    tabindex="-1"
                    aria-labelledby="confirm-dialog-title"
                    aria-describedby="confirm-dialog-description"
                >
                    <div class="confirm-dialog__mark" aria-hidden="true">!</div>
                    <h2 id="confirm-dialog-title">{{ title }}</h2>
                    <p id="confirm-dialog-description">{{ message }}</p>
                    <div class="confirm-dialog__actions">
                        <button
                            ref="cancelButton"
                            class="button button--ghost"
                            type="button"
                            @click="emit('cancel')"
                        >
                            取消
                        </button>
                        <button
                            class="button"
                            :class="tone === 'primary' ? 'button--primary' : 'button--danger'"
                            type="button"
                            @click="emit('confirm')"
                        >
                            {{ confirmLabel }}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    </Teleport>
</template>
