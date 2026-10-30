import { getUniqueRotations, isValidComponentShape } from "../domain/components.js";
import {
    buildAreaReachability,
    buildSuffixAreaReachability
} from "./areaReachability.js";

function result(status, message, placements = [], statistics = {}) {
    return { status, message, placements, statistics };
}

function normalizeTarget(values, length) {
    if (!Array.isArray(values) || values.length !== length) return null;
    const target = values.map(Number);
    return target.every(Number.isInteger) ? target : null;
}

function validateTargets(rows, columns, targets, type2Enabled, labels) {
    const row = normalizeTarget(targets.row, rows);
    const column = normalizeTarget(targets.col, columns);
    const row2 = type2Enabled
        ? normalizeTarget(targets.row2, rows)
        : Array(rows).fill(0);
    const column2 = type2Enabled
        ? normalizeTarget(targets.col2, columns)
        : Array(columns).fill(0);

    if (!row || !column || row.some((value) => value < 0 || value > columns)
        || column.some((value) => value < 0 || value > rows)) {
        return {
            error: `输入错误: ${labels.type1}组件行列目标数字超出范围`
        };
    }
    if (!row2 || !column2 || row2.some((value) => value < 0 || value > columns)
        || column2.some((value) => value < 0 || value > rows)) {
        return {
            error: `输入错误: ${labels.type2}组件行列目标数字超出范围`
        };
    }

    const total1 = row.reduce((sum, value) => sum + value, 0);
    const columnTotal1 = column.reduce((sum, value) => sum + value, 0);
    if (total1 !== columnTotal1) {
        return { error: `输入错误: ${labels.type1}组件行/列目标之和不相等` };
    }

    const total2 = row2.reduce((sum, value) => sum + value, 0);
    const columnTotal2 = column2.reduce((sum, value) => sum + value, 0);
    if (total2 !== columnTotal2) {
        return { error: `输入错误: ${labels.type2}组件行/列目标之和不相等` };
    }

    return {
        row,
        column,
        row2,
        column2,
        total1,
        total2
    };
}

export function solveCircuit(input) {
    const startedAt = performance.now();
    const rows = Number(input.rows);
    const columns = Number(input.columns);
    const type2Enabled = Boolean(input.type2Enabled);
    const labels = {
        type1: input.labels?.type1 || "第一类",
        type2: input.labels?.type2 || "第二类"
    };

    if (!Number.isInteger(rows) || rows < 1 || rows > 10
        || !Number.isInteger(columns) || columns < 1 || columns > 10) {
        return result("invalid", "输入错误: 棋盘尺寸应为 1 至 10 的整数");
    }

    const targets = validateTargets(
        rows,
        columns,
        input.targets ?? {},
        type2Enabled,
        labels
    );
    if (targets.error) return result("invalid", targets.error);

    const components = Array.isArray(input.components) ? input.components : [];
    const boardCells = Array.isArray(input.cells) ? input.cells : [];
    if (boardCells.length !== rows * columns) {
        return result("invalid", "输入错误: 棋盘格数量与尺寸不一致");
    }
    if (boardCells.some((cell) => ![0, 1, 2, 3].includes(Number(cell?.state)))) {
        return result("invalid", "输入错误: 棋盘包含未知状态");
    }
    const componentIds = new Set();
    if (Array.from(components).some((component) => {
        const invalid = typeof component?.id !== "string" || component.id === ""
            || componentIds.has(component.id) || !isValidComponentShape(component.shape)
            || !Number.isInteger(Number(component.count ?? 0))
            || Number(component.count ?? 0) < 0
            || !Number.isInteger(Number(component.count2 ?? 0))
            || Number(component.count2 ?? 0) < 0;
        if (!invalid) componentIds.add(component.id);
        return invalid;
    })) {
        return result("invalid", "输入错误: 组件配置无效");
    }

    const totalCells = rows * columns;
    const occupied = new Uint8Array(totalCells);
    const rowType1 = Array(rows).fill(0);
    const columnType1 = Array(columns).fill(0);
    const rowType2 = Array(rows).fill(0);
    const columnType2 = Array(columns).fill(0);
    const rowEmptyCount = Array(rows).fill(0);
    const columnEmptyCount = Array(columns).fill(0);
    let nowType1 = 0;
    let nowType2 = 0;
    let totalEmpty = 0;

    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const index = row * columns + column;
            const state = Number(boardCells[index]?.state ?? 0);
            if (state === 0) {
                rowEmptyCount[row]++;
                columnEmptyCount[column]++;
                totalEmpty++;
            } else {
                occupied[index] = 1;
                if (state === 2) {
                    rowType1[row]++;
                    columnType1[column]++;
                    nowType1++;
                } else if (state === 3) {
                    rowType2[row]++;
                    columnType2[column]++;
                    nowType2++;
                }
            }
        }
    }

    for (let row = 0; row < rows; row++) {
        if (rowType1[row] > targets.row[row]) {
            return result("invalid", `输入错误: 某行的${labels.type1}组件锁定常亮格大于需求量`);
        }
        if (rowType2[row] > targets.row2[row]) {
            return result("invalid", `输入错误: 某行的${labels.type2}组件锁定常亮格大于需求量`);
        }
    }
    for (let column = 0; column < columns; column++) {
        if (columnType1[column] > targets.column[column]) {
            return result("invalid", `输入错误: 某列的${labels.type1}组件锁定常亮格大于需求量`);
        }
        if (columnType2[column] > targets.column2[column]) {
            return result("invalid", `输入错误: 某列的${labels.type2}组件锁定常亮格大于需求量`);
        }
    }

    const boardSatisfied = () => {
        if (nowType1 !== targets.total1 || nowType2 !== targets.total2) return false;
        for (let row = 0; row < rows; row++) {
            if (rowType1[row] !== targets.row[row]
                || rowType2[row] !== targets.row2[row]) return false;
        }
        for (let column = 0; column < columns; column++) {
            if (columnType1[column] !== targets.column[column]
                || columnType2[column] !== targets.column2[column]) return false;
        }
        return true;
    };

    if (boardSatisfied()) {
        return result("satisfied", "无需放置组件: 需求已满足", [], {
            elapsedMs: performance.now() - startedAt,
            visitedNodes: 0,
            candidatePlacements: 0
        });
    }
    if (totalEmpty < (targets.total1 - nowType1) + (targets.total2 - nowType2)) {
        return result("unsatisfiable", "无解: 可用格不足", [], {
            elapsedMs: performance.now() - startedAt,
            visitedNodes: 0,
            candidatePlacements: 0
        });
    }

    const neededType1 = targets.total1 - nowType1;
    const neededType2 = targets.total2 - nowType2;
    const activeComponents = [];
    for (let componentIndex = 0; componentIndex < components.length; componentIndex++) {
        const component = components[componentIndex];
        if (!(Number(component.count) > 0 && neededType1 > 0)
            && !(type2Enabled && Number(component.count2) > 0 && neededType2 > 0)) {
            continue;
        }
        const rotations = getUniqueRotations(component.shape);
        const shape = rotations[0];
        const area = shape.length;
        const count1 = Math.min(Number(component.count) || 0, Math.floor(neededType1 / area));
        const count2 = type2Enabled
            ? Math.min(Number(component.count2) || 0, Math.floor(neededType2 / area)) : 0;
        if (count1 || count2) {
            activeComponents.push({ componentIndex, rotations, area, count1, count2 });
        }
    }

    for (const [type, need] of [[1, neededType1], [2, neededType2]]) {
        const inventory = activeComponents.map((component) => ({
            area: component.area,
            count: type === 1 ? component.count1 : component.count2
        }));
        if (!buildAreaReachability(inventory, need)[need]) {
            return result("unsatisfiable", "无解: 现有组件面积无法凑出剩余目标", [], {
                elapsedMs: performance.now() - startedAt,
                visitedNodes: 0,
                candidatePlacements: 0,
                areaPrunes: 1
            });
        }
    }

    const placementsByComponent = Array.from({ length: components.length }, () => []);
    let candidatePlacementCount = 0;

    for (const { componentIndex, rotations, count1, count2 } of activeComponents) {
        const placements = placementsByComponent[componentIndex];

        for (const shape of rotations) {
            let maxRowDelta = 0;
            let maxColumnDelta = 0;
            for (const [rowDelta, columnDelta] of shape) {
                if (rowDelta > maxRowDelta) maxRowDelta = rowDelta;
                if (columnDelta > maxColumnDelta) maxColumnDelta = columnDelta;
            }

            const maxOriginRow = rows - maxRowDelta;
            const maxOriginColumn = columns - maxColumnDelta;
            for (let originRow = 0; originRow < maxOriginRow; originRow++) {
                for (let originColumn = 0; originColumn < maxOriginColumn; originColumn++) {
                    let available = true;
                    const cellIndexes = [];
                    const cellRows = [];
                    const cellColumns = [];
                    const rowsUsed = new Map();
                    const columnsUsed = new Map();

                    for (const [rowDelta, columnDelta] of shape) {
                        const row = originRow + rowDelta;
                        const column = originColumn + columnDelta;
                        const index = row * columns + column;
                        if (occupied[index]) {
                            available = false;
                            break;
                        }
                        cellIndexes.push(index);
                        cellRows.push(row);
                        cellColumns.push(column);
                        rowsUsed.set(row, (rowsUsed.get(row) || 0) + 1);
                        columnsUsed.set(column, (columnsUsed.get(column) || 0) + 1);
                    }

                    if (!available) continue;

                    const rowIds = Array.from(rowsUsed.keys());
                    const columnIds = Array.from(columnsUsed.keys());
                    const rowCounts = rowIds.map((row) => rowsUsed.get(row));
                    const columnCounts = columnIds.map((column) => columnsUsed.get(column));
                    let allowType1 = count1 > 0;
                    let allowType2 = count2 > 0;

                    for (let index = 0; index < rowIds.length; index++) {
                        const row = rowIds[index];
                        const count = rowCounts[index];
                        if (count > targets.row[row] - rowType1[row]) allowType1 = false;
                        if (count > targets.row2[row] - rowType2[row]) allowType2 = false;
                    }
                    for (let index = 0; index < columnIds.length; index++) {
                        const column = columnIds[index];
                        const count = columnCounts[index];
                        if (count > targets.column[column] - columnType1[column]) {
                            allowType1 = false;
                        }
                        if (count > targets.column2[column] - columnType2[column]) {
                            allowType2 = false;
                        }
                    }
                    if (!allowType1 && !allowType2) continue;

                    placements.push({
                        cellIndexes,
                        cellRows,
                        cellColumns,
                        rowIds,
                        rowCounts,
                        columnIds,
                        columnCounts,
                        size: shape.length,
                        typeMask: (allowType1 ? 1 : 0) | (allowType2 ? 2 : 0)
                    });
                }
            }
        }

        placements.sort((left, right) => {
            return (left.rowIds.length + left.columnIds.length)
                - (right.rowIds.length + right.columnIds.length);
        });
        for (let index = 0; index < placements.length; index++) {
            placements[index].index = index;
        }
        candidatePlacementCount += placements.length;
    }

    const groups = [];
    for (const { componentIndex, area, count1, count2 } of activeComponents) {
        const placements = placementsByComponent[componentIndex];
        if (placements.length === 0) continue;

        let type1CandidateCount = 0;
        let type2CandidateCount = 0;
        for (const placement of placements) {
            if (placement.typeMask & 1) type1CandidateCount++;
            if (placement.typeMask & 2) type2CandidateCount++;
        }

        const type1Count = Math.min(
            count1,
            type1CandidateCount
        );
        if (type1Count > 0) {
            groups.push({
                componentIndex,
                type: 1,
                count: type1Count,
                area,
                candidateCount: type1CandidateCount
            });
        }

        if (type2Enabled) {
            const type2Count = Math.min(
                count2,
                type2CandidateCount
            );
            if (type2Count > 0) {
                groups.push({
                    componentIndex,
                    type: 2,
                    count: type2Count,
                    area,
                    candidateCount: type2CandidateCount
                });
            }
        }
    }

    groups.sort((left, right) => {
        if (left.candidateCount !== right.candidateCount) {
            return left.candidateCount - right.candidateCount;
        }
        if (right.area !== left.area) return right.area - left.area;
        if (right.count !== left.count) return right.count - left.count;
        if (left.type !== right.type) return left.type - right.type;
        return left.componentIndex - right.componentIndex;
    });

    const instances = [];
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];
        for (let count = 0; count < group.count; count++) {
            instances.push({
                componentIndex: group.componentIndex,
                type: group.type,
                area: group.area,
                groupIndex
            });
        }
    }

    const suffixReachable1 = buildSuffixAreaReachability(instances, 1, neededType1);
    const suffixReachable2 = buildSuffixAreaReachability(instances, 2, neededType2);
    const nextGroupIndexes = new Int32Array(instances.length);
    for (let index = instances.length - 1; index >= 0; index--) {
        nextGroupIndexes[index] = instances[index + 1]?.groupIndex === instances[index].groupIndex
            ? nextGroupIndexes[index + 1] : index + 1;
    }

    const assignment = new Int32Array(instances.length);
    assignment.fill(-1);
    const groupLastPlacementIndex = new Int32Array(groups.length);
    groupLastPlacementIndex.fill(-1);
    let visitedNodes = 0;
    let areaPrunes = 0;

    const canStillSatisfy = (instanceIndex) => {
        if (nowType1 > targets.total1 || nowType2 > targets.total2) return false;

        const neededType1 = targets.total1 - nowType1;
        const neededType2 = targets.total2 - nowType2;
        if (neededType1 === 0 && neededType2 === 0) return boardSatisfied();
        if (neededType1 + neededType2 > totalEmpty) return false;
        if (!suffixReachable1[instanceIndex][neededType1]
            || !suffixReachable2[instanceIndex][neededType2]) {
            areaPrunes++;
            return false;
        }

        for (let row = 0; row < rows; row++) {
            const remaining = (targets.row[row] - rowType1[row])
                + (targets.row2[row] - rowType2[row]);
            if (remaining > rowEmptyCount[row]) return false;
        }
        for (let column = 0; column < columns; column++) {
            const remaining = (targets.column[column] - columnType1[column])
                + (targets.column2[column] - columnType2[column]);
            if (remaining > columnEmptyCount[column]) return false;
        }
        return true;
    };

    const fitsPlacement = (placement, type, remainingNeed) => {
        if (placement.size > remainingNeed || placement.size > totalEmpty) return false;
        const rowLit = type === 1 ? rowType1 : rowType2;
        const columnLit = type === 1 ? columnType1 : columnType2;
        const rowTarget = type === 1 ? targets.row : targets.row2;
        const columnTarget = type === 1 ? targets.column : targets.column2;

        for (let index = 0; index < placement.rowIds.length; index++) {
            const row = placement.rowIds[index];
            const count = placement.rowCounts[index];
            if (rowEmptyCount[row] < count || rowLit[row] + count > rowTarget[row]) {
                return false;
            }
        }
        for (let index = 0; index < placement.columnIds.length; index++) {
            const column = placement.columnIds[index];
            const count = placement.columnCounts[index];
            if (columnEmptyCount[column] < count
                || columnLit[column] + count > columnTarget[column]) {
                return false;
            }
        }
        for (const index of placement.cellIndexes) {
            if (occupied[index]) return false;
        }
        return true;
    };

    const applyPlacement = (instanceIndex, placement) => {
        const type = instances[instanceIndex].type;
        const rowLit = type === 1 ? rowType1 : rowType2;
        const columnLit = type === 1 ? columnType1 : columnType2;
        for (let index = 0; index < placement.rowIds.length; index++) {
            rowLit[placement.rowIds[index]] += placement.rowCounts[index];
        }
        for (let index = 0; index < placement.columnIds.length; index++) {
            columnLit[placement.columnIds[index]] += placement.columnCounts[index];
        }
        if (type === 1) nowType1 += placement.size;
        else nowType2 += placement.size;

        for (let index = 0; index < placement.cellIndexes.length; index++) {
            occupied[placement.cellIndexes[index]] = 1;
            rowEmptyCount[placement.cellRows[index]]--;
            columnEmptyCount[placement.cellColumns[index]]--;
        }
        totalEmpty -= placement.size;
        assignment[instanceIndex] = placement.index;
    };

    const undoPlacement = (instanceIndex, placement) => {
        const type = instances[instanceIndex].type;
        for (let index = 0; index < placement.cellIndexes.length; index++) {
            occupied[placement.cellIndexes[index]] = 0;
            rowEmptyCount[placement.cellRows[index]]++;
            columnEmptyCount[placement.cellColumns[index]]++;
        }
        totalEmpty += placement.size;

        const rowLit = type === 1 ? rowType1 : rowType2;
        const columnLit = type === 1 ? columnType1 : columnType2;
        for (let index = 0; index < placement.rowIds.length; index++) {
            rowLit[placement.rowIds[index]] -= placement.rowCounts[index];
        }
        for (let index = 0; index < placement.columnIds.length; index++) {
            columnLit[placement.columnIds[index]] -= placement.columnCounts[index];
        }
        if (type === 1) nowType1 -= placement.size;
        else nowType2 -= placement.size;
        assignment[instanceIndex] = -1;
    };

    const dfs = (instanceIndex) => {
        visitedNodes++;
        if (boardSatisfied()) return true;
        if (instanceIndex >= instances.length || !canStillSatisfy(instanceIndex)) return false;

        const instance = instances[instanceIndex];
        const placements = placementsByComponent[instance.componentIndex];
        const typeBit = instance.type === 1 ? 1 : 2;
        const remainingNeed = instance.type === 1
            ? targets.total1 - nowType1
            : targets.total2 - nowType2;
        if (remainingNeed === 0) return dfs(nextGroupIndexes[instanceIndex]);

        const startIndex = groupLastPlacementIndex[instance.groupIndex] + 1;
        for (let placementIndex = startIndex;
            placementIndex < placements.length;
            placementIndex++) {
            const placement = placements[placementIndex];
            if ((placement.typeMask & typeBit) === 0
                || !fitsPlacement(placement, instance.type, remainingNeed)) continue;

            const previousIndex = groupLastPlacementIndex[instance.groupIndex];
            groupLastPlacementIndex[instance.groupIndex] = placementIndex;
            applyPlacement(instanceIndex, placement);

            if (dfs(instanceIndex + 1)) return true;

            undoPlacement(instanceIndex, placement);
            groupLastPlacementIndex[instance.groupIndex] = previousIndex;
        }
        return dfs(nextGroupIndexes[instanceIndex]);
    };

    const solved = dfs(0);
    const statistics = {
        elapsedMs: performance.now() - startedAt,
        visitedNodes,
        candidatePlacements: candidatePlacementCount,
        areaPrunes
    };
    if (!solved) {
        return result("unsatisfiable", "此输入内容无匹配解。", [], statistics);
    }

    const usedPlacements = [];
    let nextInstanceId = 1;
    for (let index = 0; index < instances.length; index++) {
        const placementIndex = assignment[index];
        if (placementIndex < 0) continue;
        const instance = instances[index];
        const placement = placementsByComponent[instance.componentIndex][placementIndex];
        const component = components[instance.componentIndex];
        usedPlacements.push({
            instanceId: nextInstanceId++,
            componentId: component.id,
            type: instance.type,
            name: component.name,
            color: component.color,
            coordinates: placement.cellRows.map((row, coordinateIndex) => [
                row,
                placement.cellColumns[coordinateIndex]
            ])
        });
    }

    return result("solved", "成功找到一个可行解。", usedPlacements, statistics);
}
