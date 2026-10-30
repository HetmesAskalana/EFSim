<script setup>
import { ref } from "vue";
import BaseDialog from "./BaseDialog.vue";

const props = defineProps({
    submitAction: { type: Function, required: true }
});
const emit = defineEmits(["close"]);
const source = ref("");
const error = ref("");

function submit() {
    error.value = "";
    if (!source.value.trim()) {
        error.value = "请先粘贴预设 JSON";
        return;
    }
    try {
        props.submitAction(source.value);
    } catch (caught) {
        error.value = caught.message || "导入失败";
    }
}
</script>

<template>
    <BaseDialog title="导入攻略预设" @close="emit('close')">
        <label class="dialog-field">
            <span>预设 JSON</span>
            <textarea
                v-model="source"
                rows="10"
                spellcheck="false"
                placeholder="请输入预设 JSON"
                @keydown.ctrl.enter.prevent="submit"
                @keydown.meta.enter.prevent="submit"
            ></textarea>
        </label>
        <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
        <template #footer>
            <button class="button button--ghost" type="button" @click="emit('close')">取消</button>
            <button class="button button--primary" type="button" @click="submit">校验并导入</button>
        </template>
    </BaseDialog>
</template>
