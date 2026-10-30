import {
    BOARD_SIZE_MAX,
    BOARD_SIZE_MIN,
    LIFT_MULTIPLIERS,
    MOUNT_MULTIPLIERS
} from "./constants.js";

export function isValidBoardSize(value) {
    return Number.isInteger(value)
        && value >= BOARD_SIZE_MIN
        && value <= BOARD_SIZE_MAX;
}

export function normalizeBoardDimensions(size) {
    const dimensions = typeof size === "number"
        ? { rows: size, columns: size }
        : { rows: size?.rows, columns: size?.columns };
    if (!isValidBoardSize(dimensions.rows)
        || !isValidBoardSize(dimensions.columns)) {
        throw new RangeError("盘面尺寸必须是 1～10 的整数");
    }
    return dimensions;
}

export function validateBoardSizeInput(rawValue, label = "尺寸") {
    const text = String(rawValue ?? "").trim();

    if (text === "") {
        return { valid: false, message: `请输入${label}` };
    }

    const value = Number(text);
    if (Number.isNaN(value) || !Number.isFinite(value)) {
        return { valid: false, message: `${label}必须是数字` };
    }
    if (!Number.isInteger(value)) {
        return { valid: false, message: `${label}必须是整数` };
    }
    if (value < BOARD_SIZE_MIN) {
        return { valid: false, message: `${label}不能小于 1` };
    }
    if (value > BOARD_SIZE_MAX) {
        return { valid: false, message: `${label}不能大于 10` };
    }

    return { valid: true, value, message: "" };
}

export function toDoubledCoordinates(size, row, column) {
    const { rows, columns } = normalizeBoardDimensions(size);
    if (!Number.isInteger(row) || !Number.isInteger(column)
        || row < 0 || row >= rows
        || column < 0 || column >= columns) {
        throw new RangeError("格子坐标超出盘面范围");
    }

    return {
        x2: 2 * column - (columns - 1),
        y2: (rows - 1) - 2 * row
    };
}

export function pointId(row, column) {
    return `${row}:${column}`;
}

export function createBoardCells(size) {
    const { rows, columns } = normalizeBoardDimensions(size);

    const cells = [];
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            cells.push({
                id: pointId(row, column),
                row,
                column,
                mountMultiplier: null
            });
        }
    }
    return cells;
}

export function createSolverPoint(size, cell) {
    const { x2, y2 } = toDoubledCoordinates(
        size,
        cell.row,
        cell.column
    );

    const mountMultiplier = cell.mountMultiplier ?? 1;
    if (!MOUNT_MULTIPLIERS.includes(mountMultiplier)) {
        throw new RangeError("挂载倍率必须是 1、2 或 3");
    }

    return {
        id: cell.id ?? pointId(cell.row, cell.column),
        row: cell.row,
        column: cell.column,
        x2,
        y2,
        mountMultiplier
    };
}

export function buildMountPoints(size, cells) {
    return cells
        .filter((cell) => MOUNT_MULTIPLIERS.includes(cell.mountMultiplier))
        .map((cell) => createSolverPoint(size, cell));
}

export function vectorContribution(point, level) {
    const lift = LIFT_MULTIPLIERS[level];
    if (lift === undefined) {
        throw new RangeError("回收气球等级必须是 1、2、3 或 4");
    }
    const mountMultiplier = point.mountMultiplier;
    if (!MOUNT_MULTIPLIERS.includes(mountMultiplier)) {
        throw new RangeError("挂载倍率必须是 1、2 或 3");
    }

    return {
        x: lift * mountMultiplier * point.x2,
        y: lift * mountMultiplier * point.y2
    };
}
