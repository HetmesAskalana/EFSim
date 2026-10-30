<script setup>
import SectionHeading from "./SectionHeading.vue";

const props = defineProps({
    rows: { type: String, required: true },
    columns: { type: String, required: true },
    error: { type: String, default: "" },
    selectedRegion: { type: String, required: true },
    regionMap: { type: Object, required: true },
    type2Enabled: { type: Boolean, required: true },
    type2Label: { type: String, required: true },
    inputMode: { type: String, required: true },
    disabled: { type: Boolean, default: false }
});

const emit = defineEmits([
    "update:rows",
    "update:columns",
    "update:region",
    "update:type2-enabled",
    "update:input-mode",
    "generate"
]);

function requestType2Change(event) {
    const nextValue = event.target.checked;
    // Keep the current state visible while the parent waits for confirmation.
    event.target.checked = props.type2Enabled;
    emit("update:type2-enabled", nextValue);
}
</script>

<template>
    <section class="panel-section setup-panel" aria-labelledby="setup-heading">
        <SectionHeading index="01" title="基础设置">
            <template #title>
                <span id="setup-heading">基础设置</span>
            </template>
        </SectionHeading>

        <form class="setup-grid" @submit.prevent="emit('generate')">
            <div class="setup-group setup-group--size">
                <span class="control-label">棋盘尺寸</span>
                <div class="size-fields">
                    <label>
                        <span>行</span>
                        <input
                            :value="rows"
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            inputmode="numeric"
                            :disabled="disabled"
                            :aria-invalid="Boolean(error)"
                            @input="emit('update:rows', $event.target.value)"
                        >
                    </label>
                    <span class="size-fields__times" aria-hidden="true">×</span>
                    <label>
                        <span>列</span>
                        <input
                            :value="columns"
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            inputmode="numeric"
                            :disabled="disabled"
                            :aria-invalid="Boolean(error)"
                            @input="emit('update:columns', $event.target.value)"
                        >
                    </label>
                    <button
                        class="button button--confirm size-control__submit"
                        type="submit"
                        data-testid="size-confirm-button"
                        :disabled="disabled || Boolean(error)"
                    >
                        <span class="button__icon" aria-hidden="true">
                            <svg viewBox="0 0 20 20" focusable="false">
                                <path d="M4.5 10.2L8.2 13.8L15.5 6.5"></path>
                            </svg>
                        </span>
                        <span>确定</span>
                    </button>
                </div>
                <p v-if="error" class="field-message field-message--error">{{ error }}</p>
            </div>

            <label class="setup-group setup-group--region">
                <span class="control-label">当前区域</span>
                <span class="select-control">
                    <select
                        :value="selectedRegion"
                        :disabled="disabled"
                        @change="emit('update:region', $event.target.value)"
                    >
                        <option v-for="(name, id) in regionMap" :key="id" :value="id">
                            {{ name }}
                        </option>
                    </select>
                    <span aria-hidden="true">⌄</span>
                </span>
            </label>

            <div class="setup-group setup-group--options">
                <span class="control-label">组件类型</span>
                <label class="switch-control">
                    <input
                        :checked="type2Enabled"
                        type="checkbox"
                        :disabled="disabled"
                        @change="requestType2Change"
                    >
                    <span class="switch-control__track" aria-hidden="true"></span>
                    <span>{{ type2Label }}</span>
                </label>
            </div>

            <div class="setup-group setup-group--mode">
                <span class="control-label">目标输入</span>
                <div class="segmented-control" aria-label="目标输入模式">
                    <button
                        type="button"
                        :class="{ active: inputMode === 'direct' }"
                        :aria-pressed="inputMode === 'direct'"
                        :disabled="disabled"
                        @click="emit('update:input-mode', 'direct')"
                    >
                        键盘输入
                    </button>
                    <button
                        type="button"
                        :class="{ active: inputMode === 'tap' }"
                        :aria-pressed="inputMode === 'tap'"
                        :disabled="disabled"
                        @click="emit('update:input-mode', 'tap')"
                    >
                        按键输入
                    </button>
                </div>
            </div>
        </form>
    </section>
</template>
