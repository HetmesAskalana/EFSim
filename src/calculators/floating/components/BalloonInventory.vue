<script setup>
import { nextTick } from "vue";
import {
    BALLOON_LEVELS,
    BALLOON_LABELS,
    LIFT_MULTIPLIERS,
    MAX_BALLOON_COUNT
} from "../domain/constants.js";
import RecoveryBalloonIcon from "./RecoveryBalloonIcon.vue";

const props = defineProps({
    counts: {
        type: Object,
        required: true
    },
    drafts: {
        type: Object,
        required: true
    },
    mountCount: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    quantityMessage: {
        type: String,
        required: true
    },
    quantityTone: {
        type: String,
        default: "hint",
        validator: (value) => ["hint", "error"].includes(value)
    }
});

const emit = defineEmits(["input", "blur", "adjust"]);
const levels = BALLOON_LEVELS;

function updateCount(level, event, finalize = false) {
    emit(finalize ? "blur" : "input", level, event.target.value);
    void nextTick(() => {
        event.target.value = props.drafts[level];
    });
}

function maximumFor(level) {
    const otherTotal = levels
        .filter((candidate) => candidate !== level)
        .reduce((sum, candidate) => sum + props.counts[candidate], 0);
    return Math.min(MAX_BALLOON_COUNT, Math.max(0, props.capacity - otherTotal));
}
</script>

<template>
    <aside class="inventory-panel" aria-labelledby="inventory-heading">
        <div class="section-heading">
            <div>
                <span class="section-heading__index">03</span>
                <h2 id="inventory-heading">气球配置</h2>
            </div>
            <span
                class="balloon-count-badge"
                title="气球总数 / 挂载点数"
                aria-label="气球总数与挂载点数"
            >
                <span data-testid="balloon-total">{{ total }}</span>
                /
                <span data-testid="mount-count">{{ mountCount }}</span>
            </span>
        </div>

        <div class="inventory-list">
            <div
                v-for="level in levels"
                :key="level"
                class="inventory-item"
                :class="`inventory-item--${level}`"
            >
                <div class="inventory-item__identity">
                    <RecoveryBalloonIcon
                        :level="level"
                        class="inventory-item__balloon-icon"
                    />
                    <div class="inventory-item__copy">
                        <strong>{{ BALLOON_LABELS[level] }}</strong>
                        <small class="inventory-item__lift">
                            升力：{{ LIFT_MULTIPLIERS[level] }}
                        </small>
                    </div>
                </div>
                <div class="stepper">
                    <button
                        type="button"
                        :aria-label="`减少${BALLOON_LABELS[level]}`"
                        :disabled="counts[level] <= 0"
                        @click="emit('adjust', level, -1)"
                    >
                        −
                    </button>
                    <label :for="`balloon-count-${level}`" class="visually-hidden">
                        {{ BALLOON_LABELS[level] }}数量
                    </label>
                    <input
                        :id="`balloon-count-${level}`"
                        :value="drafts[level]"
                        type="number"
                        min="0"
                        :max="maximumFor(level)"
                        step="1"
                        inputmode="numeric"
                        :aria-label="`${BALLOON_LABELS[level]}数量`"
                        :data-testid="`balloon-count-${level}`"
                        @input="updateCount(level, $event)"
                        @blur="updateCount(level, $event, true)"
                    >
                    <button
                        type="button"
                        :aria-label="`增加${BALLOON_LABELS[level]}`"
                        :disabled="counts[level] >= maximumFor(level)"
                        @click="emit('adjust', level, 1)"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>

        <p
            v-if="quantityMessage"
            class="inventory-summary"
            :class="{ 'inventory-summary--error': quantityTone === 'error' }"
            aria-live="polite"
        >
            <span class="inventory-summary__indicator" aria-hidden="true"></span>
            {{ quantityMessage }}
        </p>
    </aside>
</template>
