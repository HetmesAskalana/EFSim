<script setup>
import { computed } from "vue";

const props = defineProps({
    phase: {
        type: String,
        required: true
    },
    message: {
        type: String,
        default: ""
    }
});

const title = computed(() => ({
    calculating: "运算中",
    solved: "计算完成",
    unsatisfiable: "无解",
    error: "计算失败"
}[props.phase] ?? "提示"));
</script>

<template>
    <section
        v-if="message"
        class="status-message"
        :class="`status-message--${phase}`"
        :role="phase === 'error' ? 'alert' : 'status'"
        aria-live="polite"
        data-testid="status-message"
    >
        <span class="status-message__icon" aria-hidden="true"></span>
        <div>
            <strong>{{ title }}</strong>
            <p>{{ message }}</p>
        </div>
    </section>
</template>
