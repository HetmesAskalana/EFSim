<script setup>
defineProps({
    rows: {
        type: String,
        required: true
    },
    columns: {
        type: String,
        required: true
    },
    error: {
        type: String,
        default: ""
    },
    mountMultiplierMode: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits([
    "update:rows",
    "update:columns",
    "update:mountMultiplierMode",
    "generate"
]);

function updateRows(event) {
    emit("update:rows", event.target.value);
}

function updateColumns(event) {
    emit("update:columns", event.target.value);
}

function updateMountMultiplierMode(event) {
    emit("update:mountMultiplierMode", event.target.checked);
}
</script>

<template>
    <section class="board-settings panel-section" aria-labelledby="board-settings-heading">
        <div class="section-heading">
            <div>
                <span class="section-heading__index">01</span>
                <h2 id="board-settings-heading">基础设置</h2>
            </div>
        </div>
        <form class="setup-grid" @submit.prevent="emit('generate')">
            <div class="setup-group setup-group--size">
                <span class="control-label">棋盘尺寸</span>
                <div class="size-fields">
                    <label>
                        <span>行</span>
                        <input
                            id="board-rows"
                            :value="rows"
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            inputmode="numeric"
                            aria-label="行数"
                            :aria-invalid="Boolean(error)"
                            :aria-describedby="error ? 'board-size-error' : undefined"
                            @input="updateRows"
                        >
                    </label>
                    <span class="size-fields__times" aria-hidden="true">×</span>
                    <label>
                        <span>列</span>
                        <input
                            id="board-columns"
                            :value="columns"
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            inputmode="numeric"
                            aria-label="列数"
                            :aria-invalid="Boolean(error)"
                            :aria-describedby="error ? 'board-size-error' : undefined"
                            @input="updateColumns"
                        >
                    </label>
                    <button
                        class="button button--confirm size-control__submit"
                        type="submit"
                        data-testid="size-confirm-button"
                    >
                        <span class="button__icon" aria-hidden="true">
                            <svg viewBox="0 0 20 20" focusable="false">
                                <path d="M4.5 10.2L8.2 13.8L15.5 6.5"></path>
                            </svg>
                        </span>
                        <span>确定</span>
                    </button>
                </div>
            </div>

            <div class="setup-group setup-group--multiplier">
                <span class="control-label">挂载倍率</span>
                <label class="switch-control">
                    <input
                        :checked="mountMultiplierMode"
                        type="checkbox"
                        role="switch"
                        data-testid="mount-multiplier-switch"
                        @change="updateMountMultiplierMode"
                    >
                    <span class="switch-control__track" aria-hidden="true"></span>
                    <span>需要设置挂载倍率</span>
                </label>
            </div>
        </form>
        <p v-if="error" id="board-size-error" class="field-message field-message--error">
            {{ error }}
        </p>
    </section>
</template>
