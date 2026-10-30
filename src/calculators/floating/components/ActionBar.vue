<script setup>
defineProps({
    canSolve: {
        type: Boolean,
        required: true
    },
    isCalculating: {
        type: Boolean,
        required: true
    }
});

defineEmits(["solve", "reset"]);
</script>

<template>
    <section class="action-bar" aria-label="运算操作">
        <button
            class="button button--primary action-bar__solve"
            :class="{ 'button--busy': isCalculating }"
            type="button"
            :disabled="!canSolve"
            :aria-busy="isCalculating"
            data-testid="solve-button"
            @click="$emit('solve')"
        >
            <span v-if="isCalculating" class="button-spinner" aria-hidden="true"></span>
            <span v-else class="button__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                    <path d="M6.5 4.8L15 10L6.5 15.2Z"></path>
                </svg>
            </span>
            <span>{{ isCalculating ? "运算中" : "开始计算" }}</span>
        </button>
        <button
            class="button button--reset action-bar__reset"
            type="button"
            :disabled="isCalculating"
            data-testid="reset-button"
            @click="$emit('reset')"
        >
            <span class="button__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                    <path d="M15.5 7.2A6 6 0 1 0 16 11"></path>
                    <path d="M15.5 3.8V7.4H11.9"></path>
                </svg>
            </span>
            <span>重置</span>
        </button>
    </section>
</template>
