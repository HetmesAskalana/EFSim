<script setup>
import ComponentShapePreview from "./ComponentShapePreview.vue";
import CountStepper from "./CountStepper.vue";

defineProps({
    component: { type: Object, required: true },
    index: { type: Number, required: true },
    type2Enabled: { type: Boolean, required: true },
    typeLabels: { type: Object, required: true },
    maximum: { type: Number, required: true },
    disabled: { type: Boolean, default: false },
    expanded: { type: Boolean, default: false }
});

const emit = defineEmits(["set-count", "adjust-count"]);
</script>

<template>
    <article
        class="component-card"
        :class="{ 'component-card--expanded': expanded, 'component-card--active': component.count > 0 || component.count2 > 0 }"
        :style="{
            '--component-color': component.color,
            '--component-delay': `${Math.min(index, 10) * 8}ms`
        }"
    >
        <div class="component-card__identity">
            <span class="component-card__preview">
                <ComponentShapePreview :component="component" :large="expanded" />
            </span>
            <div class="component-card__name">
                <h3>{{ component.name }}</h3>
            </div>
        </div>
        <div class="component-card__counts">
            <label>
                <span><i class="type-dot type-dot--1"></i>{{ typeLabels.type1 }}</span>
                <CountStepper
                    :value="component.count"
                    :maximum="maximum"
                    :label="`${component.name}${typeLabels.type1}组件数量`"
                    :type="1"
                    :disabled="disabled"
                    @set="emit('set-count', index, 1, $event)"
                    @adjust="emit('adjust-count', index, 1, $event)"
                />
            </label>
            <label v-if="type2Enabled">
                <span><i class="type-dot type-dot--2"></i>{{ typeLabels.type2 }}</span>
                <CountStepper
                    :value="component.count2"
                    :maximum="maximum"
                    :label="`${component.name}${typeLabels.type2}组件数量`"
                    :type="2"
                    :disabled="disabled"
                    @set="emit('set-count', index, 2, $event)"
                    @adjust="emit('adjust-count', index, 2, $event)"
                />
            </label>
        </div>
    </article>
</template>
