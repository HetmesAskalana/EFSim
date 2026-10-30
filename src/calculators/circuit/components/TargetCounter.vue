<script setup>
import { nextTick } from "vue";

const props = defineProps({
    value: { type: Number, required: true },
    maximum: { type: Number, required: true },
    mode: { type: String, required: true },
    type: { type: Number, required: true },
    label: { type: String, required: true },
    orientation: { type: String, required: true },
    disabled: { type: Boolean, default: false }
});

const emit = defineEmits(["set", "adjust"]);

function setDirectValue(event) {
    emit("set", event.target.value);
    nextTick(() => {
        event.target.value = String(props.value);
    });
}
</script>

<template>
    <input
        v-if="mode === 'direct'"
        class="target-counter target-counter--input"
        :class="[`target-counter--type-${type}`, `target-counter--${orientation}`]"
        :value="value"
        type="number"
        min="0"
        :max="maximum"
        step="1"
        inputmode="numeric"
        :aria-label="label"
        :disabled="disabled"
        @input="setDirectValue"
        @blur="$event.target.value = String(value)"
        @focus="$event.target.select()"
        @keydown.up.prevent="emit('adjust', 1)"
        @keydown.down.prevent="emit('adjust', -1)"
    >
    <div
        v-else
        class="target-counter target-counter--stepper"
        :class="[`target-counter--type-${type}`, `target-counter--${orientation}`]"
        role="group"
        :aria-label="label"
    >
        <button
            type="button"
            :aria-label="`减少${label}`"
            :disabled="disabled || value <= 0"
            @click="emit('adjust', -1)"
        >−</button>
        <output :aria-label="`${label}，当前 ${value}`">{{ value }}</output>
        <button
            type="button"
            :aria-label="`增加${label}`"
            :disabled="disabled || value >= maximum"
            @click="emit('adjust', 1)"
        >+</button>
    </div>
</template>
