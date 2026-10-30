import { computed, reactive, ref } from "vue";
import {
    BALLOON_LEVELS,
    DEFAULT_BOARD_SIZE,
    MAX_BALLOON_COUNT,
    MOUNT_MULTIPLIERS
} from "../domain/constants.js";
import {
    buildMountPoints,
    createBoardCells,
    validateBoardSizeInput
} from "../domain/coordinates.js";
import {
    balloonTotal as calculateBalloonTotal,
    createEmptyBalloonCounts,
    normalizeBalloonCount,
    validateBalloonCounts
} from "../domain/inventory.js";
import { verifyAssignments } from "../domain/verifier.js";
import {
    createSolverClient,
    SolverCancelledError
} from "../services/solverClient.js";

function countDraftsFrom(counts) {
    return Object.fromEntries(
        BALLOON_LEVELS.map((level) => [level, String(counts[level])])
    );
}

export function useCalculator({
    solverClient = createSolverClient(),
    logger = console
} = {}) {
    const boardRows = ref(DEFAULT_BOARD_SIZE);
    const boardColumns = ref(DEFAULT_BOARD_SIZE);
    const boardRowsInput = ref(String(DEFAULT_BOARD_SIZE));
    const boardColumnsInput = ref(String(DEFAULT_BOARD_SIZE));
    const boardSizeError = ref("");
    const cells = ref(createBoardCells(DEFAULT_BOARD_SIZE));
    const mountMultiplierMode = ref(false);
    const balloonCounts = reactive(createEmptyBalloonCounts());
    const balloonDrafts = reactive(countDraftsFrom(balloonCounts));
    const phase = ref("idle");
    const statusMessage = ref("");
    const assignmentsByPoint = ref({});
    const verification = ref(null);
    const boardEditHistory = [];
    let inputRevision = 0;
    const BOARD_EDIT_HISTORY_LIMIT = 100;

    const mountCount = computed(() => (
        cells.value.reduce(
            (count, cell) => count + (
                MOUNT_MULTIPLIERS.includes(cell.mountMultiplier) ? 1 : 0
            ),
            0
        )
    ));
    const balloonTotal = computed(() => calculateBalloonTotal(balloonCounts));
    const boardCapacity = computed(
        () => boardRows.value * boardColumns.value
    );
    const inventoryValidation = computed(() => validateBalloonCounts(
        balloonCounts,
        { maximumTotal: mountCount.value }
    ));
    const isCalculating = computed(() => phase.value === "calculating");
    const canSolve = computed(() => (
        mountCount.value > 0
        && balloonTotal.value > 0
        && inventoryValidation.value.valid
        && !isCalculating.value
    ));
    const quantityMessage = computed(() => {
        if (!inventoryValidation.value.valid) {
            return inventoryValidation.value.message;
        }
        if (mountCount.value === 0) {
            return "请先设置挂载点";
        }
        if (balloonTotal.value === 0) {
            return "请至少配置 1 个回收气球";
        }
        return "";
    });
    const quantityTone = computed(() => (
        inventoryValidation.value.valid ? "hint" : "error"
    ));

    function clearDisplayedResult(message = "") {
        assignmentsByPoint.value = {};
        verification.value = null;
        phase.value = "idle";
        statusMessage.value = message;
    }

    function cancelPendingSolve() {
        if (isCalculating.value) {
            solverClient.cancelAll?.();
        }
    }

    function invalidateAfterInputChange() {
        inputRevision += 1;
        cancelPendingSolve();
        clearDisplayedResult();
    }

    function cloneCells(source = cells.value) {
        return source.map((cell) => ({ ...cell }));
    }

    function rememberBoardEdit() {
        boardEditHistory.push({
            cells: cloneCells(),
            mountMultiplierMode: mountMultiplierMode.value
        });
        if (boardEditHistory.length > BOARD_EDIT_HISTORY_LIMIT) {
            boardEditHistory.shift();
        }
    }

    function clearBoardEditHistory() {
        boardEditHistory.length = 0;
    }

    function mountStatesDiffer(left, right) {
        return left.length !== right.length
            || left.some((cell, index) => (
                cell.mountMultiplier !== right[index]?.mountMultiplier
            ));
    }

    function undoLastBoardEdit() {
        const previous = boardEditHistory.pop();
        if (!previous) {
            return false;
        }

        if (mountStatesDiffer(cells.value, previous.cells)) {
            invalidateAfterInputChange();
        }
        cells.value = cloneCells(previous.cells);
        mountMultiplierMode.value = previous.mountMultiplierMode;
        return true;
    }

    function updateBoardRowsInput(value) {
        const text = String(value ?? "");
        boardRowsInput.value = text;
        boardColumnsInput.value = text;
        boardSizeError.value = "";
    }

    function updateBoardColumnsInput(value) {
        boardColumnsInput.value = String(value ?? "");
        boardSizeError.value = "";
    }

    function generateBoard() {
        const rowsValidation = validateBoardSizeInput(
            boardRowsInput.value,
            "行数"
        );
        if (!rowsValidation.valid) {
            boardSizeError.value = rowsValidation.message;
            return false;
        }
        const columnsValidation = validateBoardSizeInput(
            boardColumnsInput.value,
            "列数"
        );
        if (!columnsValidation.valid) {
            boardSizeError.value = columnsValidation.message;
            return false;
        }

        inputRevision += 1;
        cancelPendingSolve();
        boardRows.value = rowsValidation.value;
        boardColumns.value = columnsValidation.value;
        boardRowsInput.value = String(rowsValidation.value);
        boardColumnsInput.value = String(columnsValidation.value);
        boardSizeError.value = "";
        cells.value = createBoardCells({
            rows: rowsValidation.value,
            columns: columnsValidation.value
        });
        clearBoardEditHistory();
        clearDisplayedResult();
        return true;
    }

    function toggleMountPoint(index) {
        const cell = cells.value[index];
        if (!cell) {
            return;
        }
        rememberBoardEdit();
        invalidateAfterInputChange();
        const nextCells = cells.value.slice();
        nextCells[index] = {
            ...cell,
            mountMultiplier: cell.mountMultiplier === null ? 1 : null
        };
        cells.value = nextCells;
    }

    function setMountMultiplier(index, multiplier) {
        const cell = cells.value[index];
        const isAllowedMultiplier = multiplier === null
            || MOUNT_MULTIPLIERS.includes(multiplier);
        if (!cell || !isAllowedMultiplier
            || cell.mountMultiplier === multiplier) {
            return;
        }
        rememberBoardEdit();
        invalidateAfterInputChange();
        const nextCells = cells.value.slice();
        nextCells[index] = { ...cell, mountMultiplier: multiplier };
        cells.value = nextCells;
    }

    function setMountMultiplierMode(enabled) {
        const nextMode = Boolean(enabled);
        if (mountMultiplierMode.value === nextMode) {
            return;
        }
        rememberBoardEdit();
        mountMultiplierMode.value = nextMode;
        if (nextMode) {
            return;
        }

        const hasScaledMount = cells.value.some(
            (cell) => cell.mountMultiplier === 2
                || cell.mountMultiplier === 3
        );
        if (!hasScaledMount) {
            return;
        }
        invalidateAfterInputChange();
        cells.value = cells.value.map((cell) => ({
            ...cell,
            mountMultiplier: cell.mountMultiplier === null ? null : 1
        }));
    }

    function maximumForLevel(level) {
        const otherTotal = BALLOON_LEVELS
            .filter((candidate) => candidate !== level)
            .reduce((sum, candidate) => sum + balloonCounts[candidate], 0);
        return Math.min(
            MAX_BALLOON_COUNT,
            Math.max(0, boardCapacity.value - otherTotal)
        );
    }

    function setBalloonCount(level, rawValue, { finalize = false } = {}) {
        if (!BALLOON_LEVELS.includes(level)) {
            return;
        }

        if (rawValue === "" && !finalize) {
            balloonDrafts[level] = "";
            if (balloonCounts[level] !== 0) {
                clearBoardEditHistory();
                invalidateAfterInputChange();
                balloonCounts[level] = 0;
            }
            return;
        }

        const normalized = normalizeBalloonCount(
            rawValue,
            maximumForLevel(level)
        );
        balloonDrafts[level] = String(normalized);
        if (balloonCounts[level] !== normalized) {
            clearBoardEditHistory();
            invalidateAfterInputChange();
            balloonCounts[level] = normalized;
        }
    }

    function finalizeBalloonCount(level) {
        setBalloonCount(level, balloonDrafts[level], { finalize: true });
    }

    function adjustBalloonCount(level, delta) {
        setBalloonCount(level, balloonCounts[level] + delta, { finalize: true });
    }

    function createSolverInput() {
        const dimensions = {
            rows: boardRows.value,
            columns: boardColumns.value
        };
        return {
            boardRows: dimensions.rows,
            boardColumns: dimensions.columns,
            points: buildMountPoints(dimensions, cells.value),
            balloonCounts: Object.fromEntries(
                BALLOON_LEVELS.map((level) => [level, balloonCounts[level]])
            )
        };
    }

    async function solve() {
        if (!canSolve.value) {
            return;
        }

        const solverInput = createSolverInput();
        const solveRevision = inputRevision;
        assignmentsByPoint.value = {};
        verification.value = null;
        phase.value = "calculating";
        statusMessage.value = "正在寻找方案…";

        try {
            const result = await solverClient.solve(solverInput);
            if (solveRevision !== inputRevision) {
                return;
            }

            if (result?.status === "solved") {
                const verified = verifyAssignments(solverInput, result.assignments);
                if (!verified.valid) {
                    logger.error("Solver result verification failed", {
                        result,
                        verification: verified,
                        solverInput
                    });
                    phase.value = "error";
                    statusMessage.value = "请重试";
                    assignmentsByPoint.value = {};
                    verification.value = null;
                    return;
                }

                assignmentsByPoint.value = Object.fromEntries(
                    result.assignments.map(({ pointId, level }) => [pointId, level])
                );
                verification.value = verified;
                phase.value = "solved";
                statusMessage.value = "已找到平衡方案";
                return;
            }

            if (result?.status === "unsatisfiable") {
                assignmentsByPoint.value = {};
                verification.value = null;
                phase.value = "unsatisfiable";
                statusMessage.value = "当前配置无法平衡";
                return;
            }

            phase.value = "error";
            statusMessage.value = "请重试";
            assignmentsByPoint.value = {};
            verification.value = null;
            logger.error("Solver returned an error", result);
        } catch (error) {
            if (solveRevision !== inputRevision || error instanceof SolverCancelledError) {
                return;
            }
            phase.value = "error";
            statusMessage.value = "请重试";
            assignmentsByPoint.value = {};
            verification.value = null;
            logger.error("Solver worker failed", error);
        }
    }

    function resetAll() {
        inputRevision += 1;
        cancelPendingSolve();
        boardRows.value = DEFAULT_BOARD_SIZE;
        boardColumns.value = DEFAULT_BOARD_SIZE;
        boardRowsInput.value = String(DEFAULT_BOARD_SIZE);
        boardColumnsInput.value = String(DEFAULT_BOARD_SIZE);
        boardSizeError.value = "";
        cells.value = createBoardCells(DEFAULT_BOARD_SIZE);
        mountMultiplierMode.value = false;
        clearBoardEditHistory();
        for (const level of BALLOON_LEVELS) {
            balloonCounts[level] = 0;
            balloonDrafts[level] = "0";
        }
        clearDisplayedResult();
    }

    function dispose() {
        inputRevision += 1;
        solverClient.dispose?.();
    }

    return {
        boardRows,
        boardColumns,
        boardRowsInput,
        boardColumnsInput,
        boardSizeError,
        cells,
        mountMultiplierMode,
        balloonCounts,
        balloonDrafts,
        phase,
        statusMessage,
        assignmentsByPoint,
        verification,
        mountCount,
        balloonTotal,
        boardCapacity,
        inventoryValidation,
        isCalculating,
        canSolve,
        quantityMessage,
        quantityTone,
        updateBoardRowsInput,
        updateBoardColumnsInput,
        generateBoard,
        toggleMountPoint,
        setMountMultiplier,
        setMountMultiplierMode,
        undoLastBoardEdit,
        maximumForLevel,
        setBalloonCount,
        finalizeBalloonCount,
        adjustBalloonCount,
        createSolverInput,
        solve,
        resetAll,
        dispose
    };
}
