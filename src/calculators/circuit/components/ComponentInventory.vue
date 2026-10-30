<script setup>
import ComponentCard from "./ComponentCard.vue";
import SectionHeading from "./SectionHeading.vue";

defineProps({
    components: { type: Array, required: true },
    type2Enabled: { type: Boolean, required: true },
    typeLabels: { type: Object, required: true },
    maximum: { type: Number, required: true },
    activeCount: { type: Number, required: true },
    configuredCount: { type: Number, required: true },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
});

const emit = defineEmits([
    "set-count",
    "adjust-count",
    "open-library",
    "new-custom",
    "refresh"
]);

function forwardSetCount(...args) {
    emit("set-count", ...args);
}

function forwardAdjustCount(...args) {
    emit("adjust-count", ...args);
}
</script>

<template>
    <aside class="component-panel" aria-labelledby="component-heading">
        <SectionHeading index="03" title="组件库">
            <template #title><span id="component-heading">组件库</span></template>
            <template #aside>
                <button class="icon-button component-panel__refresh" type="button" title="刷新组件定义" :disabled="disabled" @click="emit('refresh')">
                    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                        <path d="M15.5 7.2A6 6 0 1 0 16 11"></path>
                        <path d="M15.5 3.8V7.4H11.9"></path>
                    </svg>
                    <span class="visually-hidden">刷新组件定义</span>
                </button>
            </template>
        </SectionHeading>

        <div v-if="loading" class="catalog-placeholder" aria-live="polite">
            <span class="loading-spinner" aria-hidden="true"></span>
            正在读取组件定义…
        </div>
        <div v-else-if="components.length === 0" class="catalog-placeholder">
            未读取到组件定义，请检查 config.json。
        </div>
        <div v-else class="component-list">
            <ComponentCard
                v-for="(component, index) in components"
                :key="component.id"
                :component="component"
                :index="index"
                :type2-enabled="type2Enabled"
                :type-labels="typeLabels"
                :maximum="maximum"
                :disabled="disabled"
                @set-count="forwardSetCount"
                @adjust-count="forwardAdjustCount"
            />
        </div>

        <div class="component-panel__actions">
            <button class="button button--soft" type="button" :disabled="disabled" @click="emit('open-library')">
                展开组件库
            </button>
            <button class="button button--ghost" type="button" :disabled="disabled" @click="emit('new-custom')">
                新建自定义组件
            </button>
        </div>
    </aside>
</template>
