import {
    computed,
    onBeforeUnmount,
    reactive,
    ref,
    watch
} from "vue";
import {
    componentForSolver,
    createCustomComponent,
    sortComponents
} from "../domain/components.js";
import {
    BOARD_MAXIMUM,
    BOARD_MINIMUM,
    CELL_STATE,
    COMPONENT_COUNT_MAXIMUM,
    REGION_MAP,
    REGION_TYPE_LABELS,
    TAB_MAP
} from "../domain/constants.js";
import { groupPresets, parsePresetId, validatePreset } from "../domain/presets.js";
import { loadComponentConfig, loadPresetData } from "../services/dataService.js";
import { SolverClient } from "../services/solverClient.js";
import { verifySolution } from "../solver/verifier.js";

function createCells(rows, columns) {
    return Array.from({ length: rows * columns }, (_, index) => ({
        row: Math.floor(index / columns),
        column: index % columns,
        state: CELL_STATE.EMPTY,
        placed: false,
        componentId: null,
        componentInstanceId: null
    }));
}

function clampInteger(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
}

function arrayTotal(values) {
    return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

function initialRegion() {
    try {
        const region = localStorage.getItem("efsim-circuit-region");
        return Object.hasOwn(REGION_MAP, region) ? region : "V4";
    } catch {
        return "V4";
    }
}

export function useCircuitCalculator(options = {}) {
    const solverClient = options.solverClient ?? new SolverClient();
    const boardRows = ref(4);
    const boardColumns = ref(4);
    const boardRowsDraft = ref("4");
    const boardColumnsDraft = ref("4");
    const boardGenerated = ref(true);
    const rowTargets = ref(Array(4).fill(0));
    const columnTargets = ref(Array(4).fill(0));
    const row2Targets = ref(Array(4).fill(0));
    const column2Targets = ref(Array(4).fill(0));
    const cells = ref(createCells(4, 4));
    const type2Enabled = ref(false);
    const inputMode = ref("direct");
    const selectedRegion = ref(initialRegion());
    const components = ref([]);
    const presets = ref({});
    const presetSearchText = ref("");
    const selectedPresetId = ref(null);
    const expandedRegions = reactive(new Set());
    const expandedTabs = reactive(new Map());
    const isLoadingComponents = ref(false);
    const isLoadingPresets = ref(false);
    const calculateRunning = ref(false);
    const hasSolution = ref(false);
    const resultMessage = ref("");
    const resultPhase = ref("idle");
    const solverStatistics = ref(null);
    const showCustomComponentDialog = ref(false);
    const customComponentGrid = ref(createCustomGrid());
    const showComponentLibraryDialog = ref(false);
    const showImportDialog = ref(false);
    const showExportDialog = ref(false);
    const confirmation = reactive({
        open: false,
        title: "",
        message: "",
        confirmLabel: "确认",
        tone: "danger",
        action: null
    });

    const typeLabels = computed(() => {
        return REGION_TYPE_LABELS[selectedRegion.value] ?? REGION_TYPE_LABELS.V4;
    });
    const type2Label = computed(() => `包含${typeLabels.value.type2}组件`);
    const groupedPresets = computed(() => groupPresets(presets.value, presetSearchText.value));
    const totalPresetMatches = computed(() => {
        return Object.values(groupedPresets.value).reduce((regionTotal, tabs) => {
            return regionTotal + Object.values(tabs)
                .reduce((tabTotal, items) => tabTotal + items.length, 0);
        }, 0);
    });
    const selectedPreset = computed(() => {
        return selectedPresetId.value ? presets.value[selectedPresetId.value] : null;
    });
    const rowTotal1 = computed(() => arrayTotal(rowTargets.value));
    const columnTotal1 = computed(() => arrayTotal(columnTargets.value));
    const rowTotal2 = computed(() => arrayTotal(row2Targets.value));
    const columnTotal2 = computed(() => arrayTotal(column2Targets.value));
    const targetTotalsMatch = computed(() => {
        return rowTotal1.value === columnTotal1.value
            && (!type2Enabled.value || rowTotal2.value === columnTotal2.value);
    });
    const configuredComponentCount = computed(() => components.value.reduce((total, component) => {
        return total + Number(component.count || 0)
            + (type2Enabled.value ? Number(component.count2 || 0) : 0);
    }, 0));
    const activeComponentCount = computed(() => components.value.filter((component) => {
        return component.count > 0 || (type2Enabled.value && component.count2 > 0);
    }).length);
    const hasCustomComponentsWithCount = computed(() => components.value.some((component) => {
        return component.isCustom
            && (component.count > 0 || (type2Enabled.value && component.count2 > 0));
    }));
    const boardSizeError = computed(() => {
        const rows = Number(boardRowsDraft.value);
        const columns = Number(boardColumnsDraft.value);
        if (!Number.isInteger(rows) || rows < BOARD_MINIMUM || rows > BOARD_MAXIMUM
            || !Number.isInteger(columns) || columns < BOARD_MINIMUM
            || columns > BOARD_MAXIMUM) {
            return `行列都应为 ${BOARD_MINIMUM}～${BOARD_MAXIMUM} 的整数`;
        }
        return "";
    });
    const canCalculate = computed(() => {
        return boardGenerated.value && !calculateRunning.value && !isLoadingComponents.value;
    });

    watch(selectedRegion, (region) => {
        try {
            localStorage.setItem("efsim-circuit-region", region);
        } catch {
        }
    });
    watch(groupedPresets, () => {
        selectedPresetId.value = null;
        expandedRegions.clear();
        expandedTabs.clear();
        if (totalPresetMatches.value <= 5) {
            for (const [region, tabs] of Object.entries(groupedPresets.value)) {
                expandedRegions.add(region);
                expandedTabs.set(region, new Set(Object.keys(tabs)));
            }
        }
    }, { immediate: true });

    function createCustomGrid() {
        return Array.from({ length: 8 }, () => Array(8).fill(false));
    }

    function setStatus(message, phase = "idle") {
        resultMessage.value = message;
        resultPhase.value = phase;
    }

    function clearStatus() {
        resultMessage.value = "";
        resultPhase.value = "idle";
        solverStatistics.value = null;
    }

    function askForConfirmation({ title, message, confirmLabel = "确认", tone = "danger" }, action) {
        confirmation.title = title;
        confirmation.message = message;
        confirmation.confirmLabel = confirmLabel;
        confirmation.tone = tone;
        confirmation.action = action;
        confirmation.open = true;
    }

    function cancelConfirmation() {
        confirmation.open = false;
        confirmation.action = null;
    }

    async function confirmAction() {
        const action = confirmation.action;
        cancelConfirmation();
        try {
            await action?.();
        } catch (error) {
            setStatus(error.message || "操作执行失败", "error");
        }
    }

    async function initialize() {
        generateBoard();
        await Promise.allSettled([refreshComponents(false, false), refreshPresets(false)]);
    }

    async function refreshComponents(confirmFirst = true, announce = true) {
        if (calculateRunning.value || isLoadingComponents.value) return;
        if (confirmFirst) {
            askForConfirmation({
                title: "刷新组件定义？",
                message: "将重新读取 config.json，并清空当前组件数量。",
                confirmLabel: "刷新组件",
                tone: "primary"
            }, () => refreshComponents(false, true));
            return;
        }

        isLoadingComponents.value = true;
        try {
            const refreshedComponents = await loadComponentConfig(options.fetchImplementation);
            resetAnswer();
            components.value = refreshedComponents;
            if (announce) setStatus("组件列表已更新", "success");
        } catch (error) {
            setStatus(error.message || "组件列表加载失败", "error");
        } finally {
            isLoadingComponents.value = false;
        }
    }

    async function refreshPresets(confirmFirst = true) {
        if (calculateRunning.value || isLoadingPresets.value) return;
        if (confirmFirst) {
            askForConfirmation({
                title: "刷新攻略预设？",
                message: "将重新读取 presets.json。",
                confirmLabel: "刷新预设",
                tone: "primary"
            }, () => refreshPresets(false));
            return;
        }

        isLoadingPresets.value = true;
        try {
            presets.value = await loadPresetData(options.fetchImplementation);
        } catch (error) {
            presets.value = {};
            setStatus(error.message || "预设列表加载失败", "error");
        } finally {
            isLoadingPresets.value = false;
        }
    }

    function updateRowsDraft(value) {
        boardRowsDraft.value = String(value);
        boardColumnsDraft.value = String(value);
    }

    function updateColumnsDraft(value) {
        boardColumnsDraft.value = String(value);
    }

    function generateBoard() {
        if (boardSizeError.value) return;
        boardRows.value = Number(boardRowsDraft.value);
        boardColumns.value = Number(boardColumnsDraft.value);
        boardGenerated.value = true;
        rowTargets.value = Array(boardRows.value).fill(0);
        columnTargets.value = Array(boardColumns.value).fill(0);
        row2Targets.value = Array(boardRows.value).fill(0);
        column2Targets.value = Array(boardColumns.value).fill(0);
        cells.value = createCells(boardRows.value, boardColumns.value);
        for (const component of components.value) {
            component.count = 0;
            component.count2 = 0;
        }
        hasSolution.value = false;
        clearStatus();
    }

    function targetArray(type) {
        return {
            row: rowTargets.value,
            column: columnTargets.value,
            row2: row2Targets.value,
            column2: column2Targets.value
        }[type];
    }

    function targetMaximum(type) {
        return type.startsWith("row") ? boardColumns.value : boardRows.value;
    }

    function setTarget(type, index, value) {
        if (calculateRunning.value) return;
        const target = targetArray(type);
        if (!target || index < 0 || index >= target.length) return;
        target[index] = clampInteger(value, 0, targetMaximum(type), 0);
        invalidateAnswer();
    }

    function adjustTarget(type, index, delta = 1) {
        if (calculateRunning.value) return;
        const target = targetArray(type);
        if (!target || index < 0 || index >= target.length) return;
        target[index] = clampInteger(
            target[index] + delta,
            0,
            targetMaximum(type),
            0
        );
        invalidateAnswer();
    }

    function setComponentCount(componentIndex, type, value) {
        if (calculateRunning.value) return;
        const component = components.value[componentIndex];
        if (!component) return;
        const key = type === 2 ? "count2" : "count";
        component[key] = clampInteger(value, 0, COMPONENT_COUNT_MAXIMUM, 0);
        invalidateAnswer();
    }

    function adjustComponentCount(componentIndex, type, delta) {
        const component = components.value[componentIndex];
        if (!component) return;
        const key = type === 2 ? "count2" : "count";
        setComponentCount(componentIndex, type, component[key] + delta);
    }

    function invalidateAnswer() {
        if (hasSolution.value) resetAnswer();
        else if (resultPhase.value !== "idle") clearStatus();
    }

    function cycleCell(index) {
        if (calculateRunning.value) return;
        const cell = cells.value[index];
        if (!cell) return;

        const apply = () => {
            const stateCount = type2Enabled.value ? 4 : 3;
            cell.state = (cell.state + 1) % stateCount;
            cell.placed = false;
            cell.componentId = null;
            cell.componentInstanceId = null;
            clearStatus();
        };
        if (hasSolution.value) {
            askForConfirmation({
                title: "修改棋盘并清除答案？",
                message: "当前计算结果将失效，原有禁用格与锁定格会保留。",
                confirmLabel: "继续修改"
            }, () => {
                resetAnswer();
                apply();
            });
        } else {
            apply();
        }
    }

    function toggleType2(nextValue) {
        if (calculateRunning.value) return;
        if (nextValue) {
            type2Enabled.value = true;
            invalidateAnswer();
            return;
        }
        if (!boardGenerated.value) {
            type2Enabled.value = false;
            return;
        }
        askForConfirmation({
            title: `关闭${typeLabels.value.type2}组件？`,
            message: "关闭第二类组件将清空棋盘、目标与组件数量。",
            confirmLabel: "关闭并重置"
        }, () => {
            type2Enabled.value = false;
            resetAll(false);
        });
    }

    function resetAnswer() {
        if (!boardGenerated.value) return;
        for (const cell of cells.value) {
            if (!cell.placed) continue;
            cell.state = CELL_STATE.EMPTY;
            cell.placed = false;
            cell.componentId = null;
            cell.componentInstanceId = null;
        }
        hasSolution.value = false;
        clearStatus();
    }

    function resetAll(confirmFirst = true) {
        if (!boardGenerated.value || calculateRunning.value) return;
        if (confirmFirst) {
            askForConfirmation({
                title: "重置全部内容？",
                message: "将清空目标、棋盘状态、组件数量与计算结果。",
                confirmLabel: "确认重置"
            }, () => resetAll(false));
            return;
        }
        rowTargets.value = Array(boardRows.value).fill(0);
        columnTargets.value = Array(boardColumns.value).fill(0);
        row2Targets.value = Array(boardRows.value).fill(0);
        column2Targets.value = Array(boardColumns.value).fill(0);
        cells.value = createCells(boardRows.value, boardColumns.value);
        for (const component of components.value) {
            component.count = 0;
            component.count2 = 0;
        }
        hasSolution.value = false;
        clearStatus();
    }

    function solverInput() {
        return {
            rows: boardRows.value,
            columns: boardColumns.value,
            type2Enabled: type2Enabled.value,
            labels: typeLabels.value,
            targets: {
                row: rowTargets.value.slice(),
                col: columnTargets.value.slice(),
                row2: row2Targets.value.slice(),
                col2: column2Targets.value.slice()
            },
            cells: cells.value.map((cell) => ({ state: cell.placed ? 0 : cell.state })),
            components: components.value.map(componentForSolver)
        };
    }

    async function calculate() {
        if (!canCalculate.value) return;
        if (hasSolution.value) {
            setStatus("已计算出解答，无需重复计算", "success");
            return;
        }

        clearStatus();
        calculateRunning.value = true;
        resultPhase.value = "calculating";
        resultMessage.value = "正在搜索可行的组件摆放方案…";
        const input = solverInput();
        try {
            const solution = await solverClient.solve(input);
            solverStatistics.value = solution.statistics ?? null;
            if (["solved", "satisfied"].includes(solution.status)) {
                const verification = verifySolution(input, solution);
                if (!verification.valid) {
                    throw new Error(`求解结果复核失败：${verification.reason}`);
                }
                applySolution(solution);
                hasSolution.value = true;
                setStatus(solution.message, "success");
            } else {
                hasSolution.value = false;
                setStatus(solution.message, solution.status === "invalid" ? "error" : "unsatisfiable");
            }
        } catch (error) {
            hasSolution.value = false;
            setStatus(error.message || "计算过程中出现异常", "error");
        } finally {
            calculateRunning.value = false;
        }
    }

    function applySolution(solution) {
        for (const placement of solution.placements ?? []) {
            for (const [row, column] of placement.coordinates) {
                const cell = cells.value[row * boardColumns.value + column];
                cell.placed = true;
                cell.componentId = placement.componentId;
                cell.componentInstanceId = placement.instanceId;
                cell.state = placement.type === 1 ? CELL_STATE.LOCKED : CELL_STATE.RELOCKED;
            }
        }
    }

    function toggleRegion(region) {
        if (expandedRegions.has(region)) expandedRegions.delete(region);
        else expandedRegions.add(region);
    }

    function toggleTab(region, tab) {
        if (!expandedTabs.has(region)) expandedTabs.set(region, new Set());
        const tabs = expandedTabs.get(region);
        if (tabs.has(tab)) tabs.delete(tab);
        else tabs.add(tab);
    }

    function selectPreset(id) {
        if (calculateRunning.value) return;
        selectedPresetId.value = selectedPresetId.value === id ? null : id;
    }

    function requestApplyPreset() {
        if (!selectedPreset.value || !selectedPresetId.value) return;
        const preset = selectedPreset.value;
        const id = selectedPresetId.value;
        askForConfirmation({
            title: `应用“${preset.name}”？`,
            message: "当前棋盘、目标和组件数量将被该攻略覆盖。",
            confirmLabel: "应用预设",
            tone: "primary"
        }, () => loadPreset(preset, id));
    }

    function loadPreset(preset, id = "") {
        const validationError = validatePreset(preset);
        if (validationError) throw new TypeError(validationError);

        const unknownComponent = preset.component.find((componentData) => {
            return !components.value.some((component) => component.id === componentData.id);
        });
        if (unknownComponent) {
            throw new TypeError(`组件列表中不存在 ${unknownComponent.id}`);
        }

        const rows = Number(preset.n);
        const columns = Number(preset.m ?? preset.n);
        boardRows.value = rows;
        boardColumns.value = columns;
        boardRowsDraft.value = String(rows);
        boardColumnsDraft.value = String(columns);
        type2Enabled.value = Boolean(preset.isType2Activated);
        cells.value = createCells(rows, columns);
        for (const cellData of preset.gridCell) {
            cells.value[cellData.r * columns + cellData.c].state = Number(cellData.state) || 0;
        }
        rowTargets.value = preset.target.row.map(Number);
        columnTargets.value = preset.target.col.map(Number);
        row2Targets.value = preset.target.row2?.map(Number) ?? Array(rows).fill(0);
        column2Targets.value = preset.target.col2?.map(Number) ?? Array(columns).fill(0);
        for (const component of components.value) {
            component.count = 0;
            component.count2 = 0;
        }
        for (const componentData of preset.component) {
            const component = components.value.find((item) => item.id === componentData.id);
            if (!component) continue;
            component.count = clampInteger(componentData.count, 0, COMPONENT_COUNT_MAXIMUM, 0);
            component.count2 = type2Enabled.value
                ? clampInteger(componentData.count2, 0, COMPONENT_COUNT_MAXIMUM, 0)
                : 0;
        }
        const parsed = parsePresetId(id);
        if (parsed && REGION_MAP[parsed.region]) selectedRegion.value = parsed.region;
        boardGenerated.value = true;
        hasSolution.value = false;
        selectedPresetId.value = null;
        setStatus(`已加载预设：${preset.name}`, "success");
    }

    function openImportDialog() {
        if (!calculateRunning.value) showImportDialog.value = true;
    }

    function importPresetJson(source) {
        let preset;
        try {
            preset = JSON.parse(source);
        } catch {
            throw new TypeError("JSON 格式错误，请检查后重试");
        }
        const validationError = validatePreset(preset);
        if (validationError) throw new TypeError(validationError);
        showImportDialog.value = false;
        askForConfirmation({
            title: `导入“${preset.name}”？`,
            message: "当前棋盘、目标和组件数量将被导入内容覆盖。",
            confirmLabel: "确认导入",
            tone: "primary"
        }, () => loadPreset(preset));
    }

    function openExportDialog() {
        if (!hasSolution.value || calculateRunning.value || hasCustomComponentsWithCount.value) return;
        showExportDialog.value = true;
    }

    function createPresetExport(name) {
        const trimmedName = name.trim();
        if (!trimmedName) throw new TypeError("预设名称不能为空");
        return {
            name: trimmedName,
            n: boardRows.value,
            m: boardColumns.value,
            isType2Activated: type2Enabled.value,
            target: {
                row: rowTargets.value.slice(),
                col: columnTargets.value.slice(),
                row2: type2Enabled.value ? row2Targets.value.slice() : Array(boardRows.value).fill(0),
                col2: type2Enabled.value
                    ? column2Targets.value.slice()
                    : Array(boardColumns.value).fill(0)
            },
            gridCell: cells.value
                .filter((cell) => !cell.placed && cell.state !== CELL_STATE.EMPTY)
                .map((cell) => ({ r: cell.row, c: cell.column, state: cell.state })),
            component: components.value
                .filter((component) => component.count > 0
                    || (type2Enabled.value && component.count2 > 0))
                .map((component) => ({
                    id: component.id,
                    count: component.count,
                    count2: type2Enabled.value ? component.count2 : 0
                }))
        };
    }

    async function exportPreset(name) {
        const preset = createPresetExport(name);
        const json = JSON.stringify(preset);
        await navigator.clipboard.writeText(json);
        showExportDialog.value = false;
        setStatus("预设 JSON 已复制到剪贴板", "success");
        return json;
    }

    function openCustomComponent() {
        if (calculateRunning.value) return;
        customComponentGrid.value = createCustomGrid();
        showCustomComponentDialog.value = true;
    }

    function toggleCustomComponentCell(row, column) {
        customComponentGrid.value[row][column] = !customComponentGrid.value[row][column];
    }

    function finishCustomComponent() {
        const sequence = components.value.filter((component) => component.isCustom).length + 1;
        const component = createCustomComponent(customComponentGrid.value, sequence);
        if (components.value.some((item) => item.id === component.id)) {
            throw new TypeError("该形状的自定义组件已存在");
        }
        components.value.push(component);
        sortComponents(components.value);
        showCustomComponentDialog.value = false;
    }

    onBeforeUnmount(() => solverClient.dispose());

    return {
        BOARD_MAXIMUM,
        BOARD_MINIMUM,
        COMPONENT_COUNT_MAXIMUM,
        REGION_MAP,
        TAB_MAP,
        activeComponentCount,
        adjustComponentCount,
        adjustTarget,
        hasSolution,
        askForConfirmation,
        boardColumns,
        boardColumnsDraft,
        boardGenerated,
        boardRows,
        boardRowsDraft,
        boardSizeError,
        calculate,
        calculateRunning,
        cancelConfirmation,
        canCalculate,
        cells,
        column2Targets,
        columnTargets,
        columnTotal1,
        columnTotal2,
        components,
        configuredComponentCount,
        confirmAction,
        confirmation,
        createPresetExport,
        customComponentGrid,
        cycleCell,
        expandedRegions,
        expandedTabs,
        exportPreset,
        finishCustomComponent,
        generateBoard,
        groupedPresets,
        hasCustomComponentsWithCount,
        initialize,
        inputMode,
        isLoadingComponents,
        isLoadingPresets,
        loadPreset,
        openCustomComponent,
        openExportDialog,
        openImportDialog,
        presetSearchText,
        presets,
        refreshComponents,
        refreshPresets,
        requestApplyPreset,
        resetAll,
        resetAnswer,
        resultMessage,
        resultPhase,
        row2Targets,
        rowTargets,
        rowTotal1,
        rowTotal2,
        selectPreset,
        selectedPreset,
        selectedPresetId,
        selectedRegion,
        setComponentCount,
        setTarget,
        showComponentLibraryDialog,
        showCustomComponentDialog,
        showExportDialog,
        showImportDialog,
        solverStatistics,
        targetTotalsMatch,
        toggleCustomComponentCell,
        toggleRegion,
        toggleTab,
        toggleType2,
        totalPresetMatches,
        type2Enabled,
        type2Label,
        typeLabels,
        updateColumnsDraft,
        updateRowsDraft,
        importPresetJson
    };
}
