<script setup>
defineProps({
    canCalculate: { type: Boolean, required: true },
    calculating: { type: Boolean, required: true },
    hasSolution: { type: Boolean, required: true },
    canExport: { type: Boolean, required: true }
});

defineEmits(["calculate", "reset-answer", "reset-all", "export"]);
</script>

<template>
    <section class="action-bar" aria-label="运算操作">
        <button
            class="button button--primary action-bar__calculate"
            :class="{ 'button--busy': calculating }"
            type="button"
            :disabled="!canCalculate"
            :aria-busy="calculating"
            @click="$emit('calculate')"
        >
            <span v-if="calculating" class="button-spinner" aria-hidden="true"></span>
            <span v-else class="button__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                    <path d="M6.5 4.8L15 10L6.5 15.2Z"></path>
                </svg>
            </span>
            <span>{{ calculating ? '运算中' : '开始计算' }}</span>
        </button>
        <button
            class="button button--ghost"
            type="button"
            :disabled="calculating || !hasSolution"
            @click="$emit('reset-answer')"
        >清除答案</button>
        <button
            class="button button--reset"
            type="button"
            :disabled="calculating"
            @click="$emit('reset-all')"
        >
            <span class="button__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                    <path d="M15.5 7.2A6 6 0 1 0 16 11"></path>
                    <path d="M15.5 3.8V7.4H11.9"></path>
                </svg>
            </span>
            <span>重置全部</span>
        </button>
        <button
            class="button button--ghost"
            type="button"
            :disabled="!canExport"
            @click="$emit('export')"
        >导出预设</button>
    </section>
</template>
