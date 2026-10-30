<script setup>
import { computed } from "vue";
import {
    BALLOON_LEVELS,
    LIFT_MULTIPLIERS
} from "../domain/constants.js";

const SYMBOL_GEOMETRY = Object.freeze({
    1: Object.freeze({ numberX: 46, numberY: 65.5 }),
    2: Object.freeze({ numberX: 46, numberY: 65.5 }),
    3: Object.freeze({ numberX: 47, numberY: 65.5 }),
    4: Object.freeze({ numberX: 48, numberY: 67 })
});

const props = defineProps({
    level: {
        type: Number,
        required: true,
        validator: (value) => BALLOON_LEVELS.includes(value)
    },
    variant: {
        type: String,
        default: "inventory",
        validator: (value) => ["inventory", "board", "legend"].includes(value)
    }
});

const symbolGeometry = computed(() => SYMBOL_GEOMETRY[props.level]);
</script>

<template>
    <span
        class="recovery-balloon-icon"
        :class="[
            `recovery-balloon-icon--${level}`,
            `recovery-balloon-icon--${variant}`
        ]"
        :data-balloon-level="level"
        :data-lift-value="LIFT_MULTIPLIERS[level]"
        aria-hidden="true"
    >
        <svg
            class="recovery-balloon-icon__drawing"
            viewBox="0 0 100 100"
            focusable="false"
        >
            <circle class="recovery-balloon-icon__ring recovery-balloon-icon__ring--edge" cx="50" cy="50" r="46"></circle>
            <circle class="recovery-balloon-icon__ring recovery-balloon-icon__ring--outer" cx="50" cy="50" r="43.5"></circle>
            <circle class="recovery-balloon-icon__ring recovery-balloon-icon__ring--middle" cx="50" cy="50" r="38.5"></circle>
            <circle class="recovery-balloon-icon__ring recovery-balloon-icon__ring--inner" cx="50" cy="50" r="29.5"></circle>
            <circle class="recovery-balloon-icon__seam" cx="50" cy="50" r="36"></circle>
            <circle class="recovery-balloon-icon__face" cx="50" cy="50" r="25.5"></circle>

            <g class="recovery-balloon-icon__mark">
                <path
                    class="recovery-balloon-icon__micro-mark"
                    d="M27 50H31M28 53H31"
                ></path>
                <g class="recovery-balloon-icon__hatching">
                    <path d="M51 57L63 45"></path>
                    <path d="M53 62L68 47"></path>
                    <path d="M58 64L73 49"></path>
                </g>
                <text
                    class="recovery-balloon-icon__number"
                    :x="symbolGeometry.numberX"
                    :y="symbolGeometry.numberY"
                    text-anchor="middle"
                >{{ LIFT_MULTIPLIERS[level] }}</text>
                <path
                    class="recovery-balloon-icon__arrow"
                    d="M64 30.8L72 40.2H68.4V50H61.1V40.2H56.8Z"
                ></path>
            </g>
        </svg>
    </span>
</template>
