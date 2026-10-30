<script setup>
import {
    onActivated,
    onBeforeUnmount,
    onDeactivated,
    onMounted,
    ref,
    watch
} from "vue";
import ActionBar from "./components/ActionBar.vue";
import BalloonInventory from "./components/BalloonInventory.vue";
import BoardGrid from "./components/BoardGrid.vue";
import BoardSettings from "./components/BoardSettings.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import StatusMessage from "./components/StatusMessage.vue";
import { useCalculator } from "./composables/useCalculator.js";

const props = defineProps({
    active: {
        type: Boolean,
        default: true
    }
});

const calculator = useCalculator();
const showResetConfirmation = ref(false);
let shortcutListening = false;

function confirmReset() {
    showResetConfirmation.value = false;
    try {
        calculator.resetAll();
    } catch (error) {
        calculator.phase.value = "error";
        calculator.statusMessage.value = error instanceof Error
            ? error.message
            : "重置失败，请重试";
    }
}

function isEditableTarget(target) {
    return target instanceof Element
        && (Boolean(target.isContentEditable) || Boolean(target.closest(
            "input, textarea, select, [contenteditable]:not([contenteditable='false'])"
        )));
}

function handleUndoShortcut(event) {
    const isUndo = (event.ctrlKey || event.metaKey)
        && !event.altKey
        && !event.shiftKey
        && event.key?.toLowerCase() === "z";
    if (!isUndo
        || event.defaultPrevented
        || event.isComposing
        || showResetConfirmation.value
        || document.body.classList.contains("mobile-menu-open")
        || document.body.classList.contains("dialog-open")
        || isEditableTarget(event.target)) {
        return;
    }
    if (calculator.undoLastBoardEdit()) {
        event.preventDefault();
    }
}

function startShortcutListener() {
    if (shortcutListening) {
        return;
    }
    document.addEventListener("keydown", handleUndoShortcut);
    shortcutListening = true;
}

function stopShortcutListener() {
    if (!shortcutListening) {
        return;
    }
    document.removeEventListener("keydown", handleUndoShortcut);
    shortcutListening = false;
}

function syncShortcutListener() {
    if (props.active) {
        startShortcutListener();
    } else {
        stopShortcutListener();
    }
}

onMounted(syncShortcutListener);
onActivated(syncShortcutListener);
onDeactivated(stopShortcutListener);
watch(() => props.active, syncShortcutListener);

onBeforeUnmount(() => {
    stopShortcutListener();
    calculator.dispose();
});
</script>

<template>
    <div class="floating-recovery">
        <div class="app-shell">
            <h2 class="visually-hidden">浮空回收计算器</h2>

        <BoardSettings
            :rows="calculator.boardRowsInput.value"
            :columns="calculator.boardColumnsInput.value"
            :error="calculator.boardSizeError.value"
            :mount-multiplier-mode="calculator.mountMultiplierMode.value"
            @update:rows="calculator.updateBoardRowsInput"
            @update:columns="calculator.updateBoardColumnsInput"
            @update:mount-multiplier-mode="calculator.setMountMultiplierMode"
            @generate="calculator.generateBoard"
        />

        <div class="workspace">
            <BoardGrid
                :active="active"
                :rows="calculator.boardRows.value"
                :columns="calculator.boardColumns.value"
                :cells="calculator.cells.value"
                :assignments="calculator.assignmentsByPoint.value"
                :mount-multiplier-mode="calculator.mountMultiplierMode.value"
                @toggle="calculator.toggleMountPoint"
                @set-multiplier="calculator.setMountMultiplier"
            />
            <BalloonInventory
                :counts="calculator.balloonCounts"
                :drafts="calculator.balloonDrafts"
                :mount-count="calculator.mountCount.value"
                :total="calculator.balloonTotal.value"
                :capacity="calculator.boardCapacity.value"
                :quantity-message="calculator.quantityMessage.value"
                :quantity-tone="calculator.quantityTone.value"
                @input="calculator.setBalloonCount"
                @blur="calculator.finalizeBalloonCount"
                @adjust="calculator.adjustBalloonCount"
            />
        </div>

        <ActionBar
            :can-solve="calculator.canSolve.value"
            :is-calculating="calculator.isCalculating.value"
            @solve="calculator.solve"
            @reset="showResetConfirmation = true"
        />

        <StatusMessage
            :phase="calculator.phase.value"
            :message="calculator.statusMessage.value"
        />

            <ConfirmDialog
                v-if="showResetConfirmation"
                title="确认重置全部内容？"
                message="将重置盘面、气球和结果，且无法撤销。"
                confirm-label="确认重置"
                tone="danger"
                @cancel="showResetConfirmation = false"
                @confirm="confirmReset"
            />
        </div>
    </div>
</template>
