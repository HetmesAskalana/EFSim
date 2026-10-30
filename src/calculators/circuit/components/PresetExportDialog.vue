<script setup>
import { ref } from "vue";
import BaseDialog from "./BaseDialog.vue";

const props = defineProps({
    submitAction: { type: Function, required: true }
});
const emit = defineEmits(["close"]);
const name = ref("");
const error = ref("");
const busy = ref(false);

async function submit() {
    error.value = "";
    busy.value = true;
    try {
        await props.submitAction(name.value);
    } catch (caught) {
        error.value = caught.message || "导出失败";
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <BaseDialog title="导出当前预设" size="small" @close="emit('close')">
        <label class="dialog-field">
            <span>预设名称</span>
            <input v-model="name" type="text" maxlength="100" placeholder="请输入此预设的名称" @keydown.enter.prevent="submit">
        </label>
        <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
        <template #footer>
            <button class="button button--ghost" type="button" :disabled="busy" @click="emit('close')">取消</button>
            <button class="button button--primary" type="button" :disabled="busy" @click="submit">
                {{ busy ? '正在复制' : '复制 JSON' }}
            </button>
        </template>
    </BaseDialog>
</template>
