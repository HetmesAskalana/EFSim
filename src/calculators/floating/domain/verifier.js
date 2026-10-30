import {
    BALLOON_LEVELS,
    LIFT_MULTIPLIERS,
    MOUNT_MULTIPLIERS
} from "./constants.js";
import {
    normalizeBoardDimensions,
    toDoubledCoordinates
} from "./coordinates.js";
import { validateBalloonCounts } from "./inventory.js";

function invalid(reason, message, details = {}) {
    return {
        valid: false,
        reason,
        message,
        sumX: null,
        sumY: null,
        usedCounts: null,
        ...details
    };
}

export function verifyAssignments(input, assignments) {
    let dimensions;
    try {
        dimensions = normalizeBoardDimensions(
            input && (input.boardRows !== undefined
                || input.boardColumns !== undefined)
                ? { rows: input.boardRows, columns: input.boardColumns }
                : input?.boardSize
        );
    } catch {
        return invalid("invalid-input", "验证输入格式无效");
    }
    if (!Array.isArray(input.points)) {
        return invalid("invalid-input", "验证输入格式无效");
    }
    if (!Array.isArray(assignments)) {
        return invalid("invalid-assignments", "等级分配必须是数组");
    }

    const inventory = validateBalloonCounts(input.balloonCounts, {
        maximumTotal: input.points.length
    });
    if (!inventory.valid) {
        return invalid("invalid-inventory", inventory.message);
    }

    const pointsById = new Map();
    const occupiedCells = new Set();
    try {
        for (const point of input.points) {
            if (!point || typeof point.id !== "string" || pointsById.has(point.id)) {
                return invalid("invalid-points", "挂载点标识缺失或重复");
            }
            const cellKey = `${point.row}:${point.column}`;
            if (occupiedCells.has(cellKey)) {
                return invalid("invalid-points", "挂载点坐标重复");
            }
            toDoubledCoordinates(dimensions, point.row, point.column);
            const mountMultiplier = point.mountMultiplier;
            if (!MOUNT_MULTIPLIERS.includes(mountMultiplier)) {
                return invalid("invalid-points", "挂载倍率必须是 1、2 或 3");
            }
            occupiedCells.add(cellKey);
            pointsById.set(point.id, { ...point, mountMultiplier });
        }
    } catch (error) {
        return invalid("invalid-points", error.message);
    }

    if (assignments.length !== inventory.total) {
        return invalid("assignment-count", "分配数量与回收气球总数不一致");
    }

    const assignedIds = new Set();
    const usedCounts = Object.fromEntries(
        BALLOON_LEVELS.map((level) => [level, 0])
    );
    let sumX = 0;
    let sumY = 0;

    for (const assignment of assignments) {
        if (!assignment || typeof assignment.pointId !== "string") {
            return invalid("malformed-assignment", "存在格式错误的等级分配");
        }
        if (assignedIds.has(assignment.pointId)) {
            return invalid("duplicate-assignment", "同一挂载点被重复分配");
        }

        const point = pointsById.get(assignment.pointId);
        if (!point) {
            return invalid("ordinary-cell-assignment", "普通格或未知格子被分配了气球");
        }
        if (!BALLOON_LEVELS.includes(assignment.level)) {
            return invalid("invalid-level", "存在无效气球等级");
        }

        const { x2, y2 } = toDoubledCoordinates(
            dimensions,
            point.row,
            point.column
        );
        assignedIds.add(assignment.pointId);
        usedCounts[assignment.level] += 1;
        sumX += LIFT_MULTIPLIERS[assignment.level]
            * point.mountMultiplier * x2;
        sumY += LIFT_MULTIPLIERS[assignment.level]
            * point.mountMultiplier * y2;
    }

    for (const level of BALLOON_LEVELS) {
        if (usedCounts[level] !== input.balloonCounts[level]) {
            return invalid("inventory-mismatch", "气球库存使用数量不正确", {
                sumX,
                sumY,
                usedCounts
            });
        }
    }

    if (sumX !== 0 || sumY !== 0) {
        return invalid("unbalanced", "等级分配的矢量和不为零", {
            sumX,
            sumY,
            usedCounts
        });
    }

    return {
        valid: true,
        reason: null,
        message: "计算结果验证通过",
        sumX,
        sumY,
        usedCounts
    };
}
