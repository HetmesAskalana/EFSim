<script setup>
import { nextTick } from "vue";

const props = defineProps({
    value: { type: Number, required: true },
    maximum: { type: Number, default: 6 },
    label: { type: String, required: true },
    type: { type: Number, required: true },
    disabled: { type: Boolean, default: false }
});

const emit = defineEmits(["set", "adjust"]);

function setCount(event) {
    emit("set", event.target.value);
    void nextTick(() => {
        event.target.value = String(props.value);
    });
}
</script>

<template>
    <div class="count-stepper" :class="`count-stepper--type-${type}`">
        <button
            type="button"
            :aria-label="`减少${label}`"
            :disabled="disabled || value <= 0"
            @click="emit('adjust', -1)"
        >−</button>
        <input
            :value="value"
            type="number"
            min="0"
            :max="maximum"
            step="1"
            inputmode="numeric"
            :aria-label="label"
            :disabled="disabled"
            @input="setCount"
        >
        <button
            type="button"
            :aria-label="`增加${label}`"
            :disabled="disabled || value >= maximum"
            @click="emit('adjust', 1)"
        >+</button>
    </div>
</template>
