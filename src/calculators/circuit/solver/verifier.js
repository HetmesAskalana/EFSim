import {
    coordinatesKey,
    getUniqueRotations,
    isValidComponentShape,
    normalizeCoordinates
} from "../domain/components.js";

export function verifySolution(input, solution) {
    if (!solution || !["solved", "satisfied"].includes(solution.status)) {
        return { valid: false, reason: "求解结果不是可验证的成功状态" };
    }
    const components = new Map();
    if (!Array.isArray(input?.components) || Array.from(input.components).some((component) => {
        if (typeof component?.id !== "string" || component.id === ""
            || components.has(component.id) || !isValidComponentShape(component.shape)) return true;
        components.set(component.id, component);
        return false;
    })) {
        return { valid: false, reason: "验证输入包含无效或重复的组件配置" };
    }
    if (solution.placements !== undefined && !Array.isArray(solution.placements)) {
        return { valid: false, reason: "答案中的组件放置数据格式无效" };
    }

    const rows = Number(input.rows);
    const columns = Number(input.columns);
    const rowCounts = [Array(rows).fill(0), Array(rows).fill(0)];
    const columnCounts = [Array(columns).fill(0), Array(columns).fill(0)];
    const occupied = new Set();
    const used = new Map();

    for (let index = 0; index < input.cells.length; index++) {
        const state = Number(input.cells[index].state);
        if (state === 0) continue;
        occupied.add(index);
        if (state === 2 || state === 3) {
            const typeIndex = state - 2;
            const row = Math.floor(index / columns);
            const column = index % columns;
            rowCounts[typeIndex][row]++;
            columnCounts[typeIndex][column]++;
        }
    }

    for (const placement of solution.placements ?? []) {
        if (!placement || !Array.isArray(placement.coordinates)
            || Array.from(placement.coordinates).some((coordinate) => (
                !Array.isArray(coordinate) || coordinate.length !== 2
                || !Number.isInteger(coordinate[0]) || !Number.isInteger(coordinate[1])
            ))) {
            return { valid: false, reason: "答案中的组件坐标格式无效" };
        }
        const component = components.get(placement.componentId);
        if (!component) return { valid: false, reason: "答案引用了未知组件" };
        if (![1, 2].includes(placement.type)) {
            return { valid: false, reason: "答案包含未知组件类型" };
        }

        const typeKey = `${placement.componentId}:${placement.type}`;
        used.set(typeKey, (used.get(typeKey) || 0) + 1);
        const allowedCount = placement.type === 1 ? component.count : component.count2;
        if (used.get(typeKey) > Number(allowedCount || 0)) {
            return { valid: false, reason: "答案使用的组件数量超过配置" };
        }

        const coordinates = placement.coordinates;
        const normalizedKey = coordinatesKey(normalizeCoordinates(coordinates));
        const validRotation = getUniqueRotations(component.shape)
            .some((rotation) => coordinatesKey(rotation) === normalizedKey);
        if (!validRotation) return { valid: false, reason: "答案中的组件形状无效" };

        for (const [row, column] of coordinates) {
            if (!Number.isInteger(row) || !Number.isInteger(column)
                || row < 0 || row >= rows || column < 0 || column >= columns) {
                return { valid: false, reason: "答案包含棋盘范围外的格子" };
            }
            const index = row * columns + column;
            if (occupied.has(index)) return { valid: false, reason: "答案中的组件发生重叠" };
            occupied.add(index);
            rowCounts[placement.type - 1][row]++;
            columnCounts[placement.type - 1][column]++;
        }
    }

    const rowTargets = [
        input.targets.row,
        input.type2Enabled ? input.targets.row2 : Array(rows).fill(0)
    ];
    const columnTargets = [
        input.targets.col,
        input.type2Enabled ? input.targets.col2 : Array(columns).fill(0)
    ];
    for (let type = 0; type < 2; type++) {
        if (rowCounts[type].some((count, row) => count !== Number(rowTargets[type][row]))) {
            return { valid: false, reason: "答案未满足行目标" };
        }
        if (columnCounts[type].some((count, column) => {
            return count !== Number(columnTargets[type][column]);
        })) {
            return { valid: false, reason: "答案未满足列目标" };
        }
    }

    return { valid: true, reason: "" };
}
