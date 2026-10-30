<script setup>
import { computed, useId } from "vue";
import { boardCellSize } from "../domain/constants.js";
import { buildComponentContours } from "../domain/componentContours.js";
import SectionHeading from "./SectionHeading.vue";
import TargetCounter from "./TargetCounter.vue";

const props = defineProps({
    rows: { type: Number, required: true },
    columns: { type: Number, required: true },
    cells: { type: Array, required: true },
    rowTargets: { type: Array, required: true },
    columnTargets: { type: Array, required: true },
    row2Targets: { type: Array, required: true },
    column2Targets: { type: Array, required: true },
    rowTotal1: { type: Number, required: true },
    columnTotal1: { type: Number, required: true },
    rowTotal2: { type: Number, required: true },
    columnTotal2: { type: Number, required: true },
    type2Enabled: { type: Boolean, required: true },
    typeLabels: { type: Object, required: true },
    inputMode: { type: String, required: true },
    totalsMatch: { type: Boolean, required: true },
    disabled: { type: Boolean, default: false },
    region: { type: String, required: true }
});

const emit = defineEmits(["set-target", "adjust-target", "cycle-cell"]);
const cellSize = computed(() => boardCellSize(props.rows, props.columns));
const stageStyle = computed(() => {
    return {
        "--board-rows": props.rows,
        "--board-columns": props.columns,
        "--cell-size": `${cellSize.value}px`
    };
});
const contourIdPrefix = `component-contour-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
const componentContours = computed(() => {
    const cornerRadiusPixels = Math.min(6, Math.max(5, cellSize.value * 0.1));
    return buildComponentContours(props.cells, cornerRadiusPixels / cellSize.value)
        .map((contour, index) => ({
            ...contour,
            clipId: `${contourIdPrefix}-${index}`,
            anchorStyle: {
                "--component-anchor-row": contour.anchorRow,
                "--component-anchor-column": contour.anchorColumn
            }
        }));
});

function cellClass(cell) {
    return {
        "puzzle-cell--empty": !cell.placed && cell.state === 0,
        "circuit-cell--disabled": !cell.placed && cell.state === 1,
        "circuit-cell--locked": !cell.placed && cell.state === 2,
        "circuit-cell--relocked": !cell.placed && cell.state === 3,
        "circuit-cell--placed": cell.placed,
        "circuit-cell--type-1": cell.placed && cell.state === 2,
        "circuit-cell--type-2": cell.placed && cell.state === 3,
        "circuit-cell--tone-a": cell.placed && (cell.row + cell.column) % 2 === 0,
        "circuit-cell--tone-b": cell.placed && (cell.row + cell.column) % 2 === 1
    };
}

function cellLabel(cell) {
    const state = cell.placed
        ? `答案组件 ${cell.componentInstanceId}`
        : ["普通格", "禁用格", `${props.typeLabels.type1}锁定格`, `${props.typeLabels.type2}重锁定格`][cell.state];
    return `第 ${cell.row + 1} 行，第 ${cell.column + 1} 列，${state}`;
}

function cellComponentStyle(cell) {
    if (!cell.placed) return undefined;
    const row = cell.row;
    const column = cell.column;
    const instanceId = cell.componentInstanceId;
    const neighborMatches = (neighborRow, neighborColumn) => {
        if (neighborRow < 0 || neighborRow >= props.rows
            || neighborColumn < 0 || neighborColumn >= props.columns) return false;
        const neighbor = props.cells[neighborRow * props.columns + neighborColumn];
        return neighbor.placed && neighbor.componentInstanceId === instanceId;
    };
    const top = neighborMatches(row - 1, column);
    const right = neighborMatches(row, column + 1);
    const bottom = neighborMatches(row + 1, column);
    const left = neighborMatches(row, column - 1);
    const corner = (sideA, sideB) => (
        sideA || sideB ? "0" : "var(--component-corner-radius)"
    );
    return {
        borderRadius: `${corner(top, left)} ${corner(top, right)} `
            + `${corner(bottom, right)} ${corner(bottom, left)}`
    };
}
</script>

<template>
    <section class="board-panel" aria-labelledby="board-heading">
        <SectionHeading index="02" title="棋盘配置">
            <template #title><span id="board-heading">棋盘配置</span></template>
            <template #aside>
                <span class="board-size-badge">{{ rows }} × {{ columns }}</span>
            </template>
        </SectionHeading>

        <div class="board-scroll" tabindex="0" aria-label="棋盘和目标配置滚动区域">
            <div class="circuit-stage" :style="stageStyle">
                <div class="axis-corner" aria-hidden="true">
                    <span>行</span><i></i><span>列</span>
                </div>
                <div class="column-axes">
                    <div v-if="type2Enabled" class="axis-track axis-track--column axis-track--type-2">
                        <TargetCounter
                            v-for="(value, index) in column2Targets"
                            :key="`column-2-${index}`"
                            :value="value"
                            :maximum="rows"
                            :mode="inputMode"
                            :type="2"
                            :label="`第 ${index + 1} 列${typeLabels.type2}目标`"
                            orientation="column"
                            :disabled="disabled"
                            @set="emit('set-target', 'column2', index, $event)"
                            @adjust="emit('adjust-target', 'column2', index, $event)"
                        />
                    </div>
                    <div class="axis-track axis-track--column axis-track--type-1">
                        <TargetCounter
                            v-for="(value, index) in columnTargets"
                            :key="`column-1-${index}`"
                            :value="value"
                            :maximum="rows"
                            :mode="inputMode"
                            :type="1"
                            :label="`第 ${index + 1} 列${typeLabels.type1}目标`"
                            orientation="column"
                            :disabled="disabled"
                            @set="emit('set-target', 'column', index, $event)"
                            @adjust="emit('adjust-target', 'column', index, $event)"
                        />
                    </div>
                </div>

                <div class="row-axes">
                    <div v-if="type2Enabled" class="axis-track axis-track--row axis-track--type-2">
                        <TargetCounter
                            v-for="(value, index) in row2Targets"
                            :key="`row-2-${index}`"
                            :value="value"
                            :maximum="columns"
                            :mode="inputMode"
                            :type="2"
                            :label="`第 ${index + 1} 行${typeLabels.type2}目标`"
                            orientation="row"
                            :disabled="disabled"
                            @set="emit('set-target', 'row2', index, $event)"
                            @adjust="emit('adjust-target', 'row2', index, $event)"
                        />
                    </div>
                    <div class="axis-track axis-track--row axis-track--type-1">
                        <TargetCounter
                            v-for="(value, index) in rowTargets"
                            :key="`row-1-${index}`"
                            :value="value"
                            :maximum="columns"
                            :mode="inputMode"
                            :type="1"
                            :label="`第 ${index + 1} 行${typeLabels.type1}目标`"
                            orientation="row"
                            :disabled="disabled"
                            @set="emit('set-target', 'row', index, $event)"
                            @adjust="emit('adjust-target', 'row', index, $event)"
                        />
                    </div>
                </div>

                <div
                    class="circuit-grid"
                    :class="`region-${region}`"
                    role="grid"
                    :aria-rowcount="rows"
                    :aria-colcount="columns"
                >
                    <button
                        v-for="(cell, index) in cells"
                        :key="`${cell.row}-${cell.column}`"
                        class="circuit-cell puzzle-cell"
                        :class="cellClass(cell)"
                        :style="cellComponentStyle(cell)"
                        type="button"
                        role="gridcell"
                        :aria-label="cellLabel(cell)"
                        :disabled="disabled"
                        @click="emit('cycle-cell', index)"
                    >
                        <span
                            v-if="cell.placed || cell.state !== 1"
                            class="circuit-cell__ornament"
                            aria-hidden="true"
                        ></span>
                        <svg
                            v-if="!cell.placed && cell.state === 1"
                            class="circuit-cell__state-icon circuit-cell__state-icon--disabled"
                            viewBox="0 0 32 32"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <circle class="circuit-cell__disabled-backdrop" cx="16" cy="16" r="10.5"></circle>
                            <path
                                class="circuit-cell__disabled-backdrop-extension"
                                d="M5.8 5.8 26.2 26.2"
                            ></path>
                            <circle class="circuit-cell__disabled-ring" cx="16" cy="16" r="8.25"></circle>
                            <path class="circuit-cell__disabled-slash" d="M5.8 5.8 26.2 26.2"></path>
                        </svg>
                        <svg
                            v-else-if="!cell.placed && (cell.state === 2 || cell.state === 3)"
                            class="circuit-cell__state-icon circuit-cell__state-icon--lock"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path class="circuit-cell__lock-shackle" d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10"></path>
                            <path class="circuit-cell__lock-body" d="M6 9.5h12v10H6z"></path>
                        </svg>
                    </button>
                    <svg
                        v-if="componentContours.length"
                        class="circuit-component-contours"
                        :viewBox="`0 0 ${columns} ${rows}`"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <defs>
                            <clipPath
                                v-for="contour in componentContours"
                                :id="contour.clipId"
                                :key="`clip-${contour.clipId}`"
                                clipPathUnits="userSpaceOnUse"
                            >
                                <path :d="contour.path" clip-rule="evenodd" fill-rule="evenodd"></path>
                            </clipPath>
                        </defs>
                        <g
                            v-for="contour in componentContours"
                            :key="`contour-${contour.clipId}`"
                            class="circuit-component-contour"
                            :class="contour.state === 3
                                ? 'circuit-component-contour--type-2'
                                : 'circuit-component-contour--type-1'"
                            :clip-path="`url(#${contour.clipId})`"
                        >
                            <path class="circuit-component-contour__underlay" :d="contour.path"></path>
                            <path class="circuit-component-contour__rim" :d="contour.path"></path>
                            <path class="circuit-component-contour__boundary" :d="contour.path"></path>
                        </g>
                    </svg>
                    <span
                        v-for="contour in componentContours"
                        :key="`label-${contour.clipId}`"
                        class="component-instance-label"
                        :style="contour.anchorStyle"
                        aria-hidden="true"
                    >
                        {{ contour.instanceId }}
                    </span>
                </div>
            </div>
        </div>

        <div class="board-instructions">
            <div class="axis-legend">
                <span class="axis-legend__item axis-legend__item--type-1">
                    <i aria-hidden="true"></i>{{ typeLabels.type1 }}目标
                </span>
                <span v-if="type2Enabled" class="axis-legend__item axis-legend__item--type-2">
                    <i aria-hidden="true"></i>{{ typeLabels.type2 }}目标
                </span>
            </div>
        </div>

    </section>
</template>
