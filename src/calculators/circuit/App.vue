<script setup>
import { computed, onMounted } from "vue";
import ActionBar from "./components/ActionBar.vue";
import BoardSetup from "./components/BoardSetup.vue";
import CircuitBoardPanel from "./components/CircuitBoardPanel.vue";
import ComponentInventory from "./components/ComponentInventory.vue";
import ComponentLibraryDialog from "./components/ComponentLibraryDialog.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import CustomComponentDialog from "./components/CustomComponentDialog.vue";
import JsonImportDialog from "./components/JsonImportDialog.vue";
import PresetExportDialog from "./components/PresetExportDialog.vue";
import PresetPanel from "./components/PresetPanel.vue";
import StatusMessage from "./components/StatusMessage.vue";
import { useCircuitCalculator } from "./composables/useCircuitCalculator.js";
import { boardCellSize } from "./domain/constants.js";

defineProps({
    active: {
        type: Boolean,
        default: true
    }
});

const calculator = useCircuitCalculator();
const workspaceStyle = computed(() => {
    const rows = calculator.boardRows.value;
    const columns = calculator.boardColumns.value;
    const cellSize = boardCellSize(rows, columns);
    const targetTrackCount = calculator.type2Enabled.value ? 2 : 1;
    const targetTrackHeight = targetTrackCount * cellSize
        + (targetTrackCount - 1) * 4
        + 8;
    const stageHeight = rows * cellSize + targetTrackHeight;
    return { "--workspace-height": `${stageHeight + 138}px` };
});

function openCustomFromLibrary() {
    calculator.showComponentLibraryDialog.value = false;
    calculator.openCustomComponent();
}

onMounted(() => calculator.initialize());
</script>

<template>
    <div class="circuit-repair">
        <div
            class="app-shell"
            :class="`region-${calculator.selectedRegion.value}`"
        >
            <h2 class="visually-hidden">电路修复计算器</h2>

        <BoardSetup
            :rows="calculator.boardRowsDraft.value"
            :columns="calculator.boardColumnsDraft.value"
            :error="calculator.boardSizeError.value"
            :selected-region="calculator.selectedRegion.value"
            :region-map="calculator.REGION_MAP"
            :type2-enabled="calculator.type2Enabled.value"
            :type2-label="calculator.type2Label.value"
            :input-mode="calculator.inputMode.value"
            :disabled="calculator.calculateRunning.value"
            @update:rows="calculator.updateRowsDraft"
            @update:columns="calculator.updateColumnsDraft"
            @update:region="calculator.selectedRegion.value = $event"
            @update:type2-enabled="calculator.toggleType2"
            @update:input-mode="calculator.inputMode.value = $event"
            @generate="calculator.generateBoard"
        />

        <div class="workspace" :style="workspaceStyle">
            <CircuitBoardPanel
                :rows="calculator.boardRows.value"
                :columns="calculator.boardColumns.value"
                :cells="calculator.cells.value"
                :row-targets="calculator.rowTargets.value"
                :column-targets="calculator.columnTargets.value"
                :row2-targets="calculator.row2Targets.value"
                :column2-targets="calculator.column2Targets.value"
                :row-total1="calculator.rowTotal1.value"
                :column-total1="calculator.columnTotal1.value"
                :row-total2="calculator.rowTotal2.value"
                :column-total2="calculator.columnTotal2.value"
                :type2-enabled="calculator.type2Enabled.value"
                :type-labels="calculator.typeLabels.value"
                :input-mode="calculator.inputMode.value"
                :totals-match="calculator.targetTotalsMatch.value"
                :disabled="calculator.calculateRunning.value"
                :region="calculator.selectedRegion.value"
                @set-target="calculator.setTarget"
                @adjust-target="calculator.adjustTarget"
                @cycle-cell="calculator.cycleCell"
            />

            <ComponentInventory
                :components="calculator.components.value"
                :type2-enabled="calculator.type2Enabled.value"
                :type-labels="calculator.typeLabels.value"
                :maximum="calculator.COMPONENT_COUNT_MAXIMUM"
                :active-count="calculator.activeComponentCount.value"
                :configured-count="calculator.configuredComponentCount.value"
                :loading="calculator.isLoadingComponents.value"
                :disabled="calculator.calculateRunning.value"
                @set-count="calculator.setComponentCount"
                @adjust-count="calculator.adjustComponentCount"
                @open-library="calculator.showComponentLibraryDialog.value = true"
                @new-custom="calculator.openCustomComponent"
                @refresh="calculator.refreshComponents"
            />
        </div>

        <ActionBar
            :can-calculate="calculator.canCalculate.value"
            :calculating="calculator.calculateRunning.value"
            :has-solution="calculator.hasSolution.value"
            :can-export="calculator.hasSolution.value
                && !calculator.calculateRunning.value
                && !calculator.hasCustomComponentsWithCount.value"
            @calculate="calculator.calculate"
            @reset-answer="calculator.resetAnswer"
            @reset-all="calculator.resetAll"
            @export="calculator.openExportDialog"
        />

        <StatusMessage
            :phase="calculator.resultPhase.value"
            :message="calculator.resultMessage.value"
        />

        <PresetPanel
            :grouped-presets="calculator.groupedPresets.value"
            :search-text="calculator.presetSearchText.value"
            :selected-preset-id="calculator.selectedPresetId.value"
            :expanded-regions="calculator.expandedRegions"
            :expanded-tabs="calculator.expandedTabs"
            :region-map="calculator.REGION_MAP"
            :tab-map="calculator.TAB_MAP"
            :match-count="calculator.totalPresetMatches.value"
            :loading="calculator.isLoadingPresets.value"
            :disabled="calculator.calculateRunning.value || calculator.isLoadingComponents.value"
            @update:search-text="calculator.presetSearchText.value = $event"
            @toggle-region="calculator.toggleRegion"
            @toggle-tab="calculator.toggleTab"
            @select="calculator.selectPreset"
            @apply="calculator.requestApplyPreset"
            @refresh="calculator.refreshPresets"
            @import="calculator.openImportDialog"
        />

        <ConfirmDialog
            v-if="calculator.confirmation.open"
            :title="calculator.confirmation.title"
            :message="calculator.confirmation.message"
            :confirm-label="calculator.confirmation.confirmLabel"
            :tone="calculator.confirmation.tone"
            @cancel="calculator.cancelConfirmation"
            @confirm="calculator.confirmAction"
        />

        <JsonImportDialog
            v-if="calculator.showImportDialog.value"
            :submit-action="calculator.importPresetJson"
            @close="calculator.showImportDialog.value = false"
        />

        <PresetExportDialog
            v-if="calculator.showExportDialog.value"
            :submit-action="calculator.exportPreset"
            @close="calculator.showExportDialog.value = false"
        />

        <CustomComponentDialog
            v-if="calculator.showCustomComponentDialog.value"
            :grid="calculator.customComponentGrid.value"
            :finish-action="calculator.finishCustomComponent"
            @toggle="calculator.toggleCustomComponentCell"
            @close="calculator.showCustomComponentDialog.value = false"
        />

            <ComponentLibraryDialog
                v-if="calculator.showComponentLibraryDialog.value"
                :components="calculator.components.value"
                :type2-enabled="calculator.type2Enabled.value"
                :type-labels="calculator.typeLabels.value"
                :region="calculator.selectedRegion.value"
                :maximum="calculator.COMPONENT_COUNT_MAXIMUM"
                :disabled="calculator.calculateRunning.value"
                @set-count="calculator.setComponentCount"
                @adjust-count="calculator.adjustComponentCount"
                @new-custom="openCustomFromLibrary"
                @refresh="calculator.refreshComponents"
                @close="calculator.showComponentLibraryDialog.value = false"
            />
        </div>
    </div>
</template>
