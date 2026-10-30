<script setup>
import { ref } from "vue";
import BaseDialog from "./BaseDialog.vue";

const props = defineProps({
    grid: { type: Array, required: true },
    finishAction: { type: Function, required: true }
});

const emit = defineEmits(["toggle", "close"]);
const error = ref("");

function finish() {
    error.value = "";
    try {
        props.finishAction();
    } catch (caught) {
        error.value = caught.message || "无法创建组件";
    }
}
</script>

<template>
    <BaseDialog title="新建自定义组件" size="large" @close="emit('close')">
        <div class="custom-component-layout">
            <div class="custom-grid-scroll" tabindex="0" aria-label="自定义组件绘制区域">
                <div class="custom-grid" role="grid" aria-rowcount="8" aria-colcount="8">
                    <template v-for="(row, rowIndex) in grid" :key="`row-${rowIndex}`">
                        <button
                            v-for="(cell, columnIndex) in row"
                            :key="`${rowIndex}-${columnIndex}`"
                            class="custom-grid__cell"
                            :class="{ 'custom-grid__cell--active': cell }"
                            type="button"
                            role="gridcell"
                            :aria-label="`第 ${rowIndex + 1} 行，第 ${columnIndex + 1} 列`"
                            :aria-pressed="cell"
                            @click="emit('toggle', rowIndex, columnIndex)"
                        ></button>
                    </template>
                </div>
            </div>
        </div>
        <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
        <template #footer>
            <button class="button button--ghost" type="button" @click="emit('close')">取消</button>
            <button class="button button--primary" type="button" @click="finish">完成绘制</button>
        </template>
    </BaseDialog>
</template>
