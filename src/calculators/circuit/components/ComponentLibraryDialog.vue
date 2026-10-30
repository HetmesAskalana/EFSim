<script setup>
import BaseDialog from "./BaseDialog.vue";
import ComponentCard from "./ComponentCard.vue";

defineProps({
    components: { type: Array, required: true },
    type2Enabled: { type: Boolean, required: true },
    typeLabels: { type: Object, required: true },
    region: { type: String, required: true },
    maximum: { type: Number, required: true },
    disabled: { type: Boolean, default: false }
});

const emit = defineEmits(["set-count", "adjust-count", "new-custom", "refresh", "close"]);

function forwardSetCount(...args) {
    emit("set-count", ...args);
}

function forwardAdjustCount(...args) {
    emit("adjust-count", ...args);
}
</script>

<template>
    <BaseDialog
        title="组件库"
        size="wide"
        :region="region"
        @close="emit('close')"
    >
        <div class="expanded-component-grid">
            <ComponentCard
                v-for="(component, index) in components"
                :key="component.id"
                :component="component"
                :index="index"
                :type2-enabled="type2Enabled"
                :type-labels="typeLabels"
                :maximum="maximum"
                :disabled="disabled"
                expanded
                @set-count="forwardSetCount"
                @adjust-count="forwardAdjustCount"
            />
        </div>
        <template #footer>
            <button class="button button--ghost" type="button" :disabled="disabled" @click="emit('refresh')">
                刷新组件定义
            </button>
            <button class="button button--soft" type="button" :disabled="disabled" @click="emit('new-custom')">
                新建自定义组件
            </button>
            <button class="button button--primary" type="button" @click="emit('close')">完成</button>
        </template>
    </BaseDialog>
</template>
