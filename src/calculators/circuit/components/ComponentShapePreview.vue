<script setup>
import { computed } from "vue";

const props = defineProps({
    component: { type: Object, required: true },
    large: { type: Boolean, default: false }
});

const previewStyle = computed(() => {
    const unit = props.large ? 20 : 15;
    return {
        "--shape-rows": props.component.sizeRows,
        "--shape-columns": props.component.sizeCols,
        "--shape-unit": `${unit}px`,
        "--component-color": props.component.color
    };
});
</script>

<template>
    <span class="component-shape" :style="previewStyle" aria-hidden="true">
        <template v-for="row in component.sizeRows" :key="`row-${row}`">
            <i
                v-for="column in component.sizeCols"
                :key="`${row}-${column}`"
                :class="{
                    'component-shape__cell--filled': component.shapeKeys.has(`${row - 1},${column - 1}`)
                }"
            ></i>
        </template>
    </span>
</template>
