import {
    BALLOON_LEVELS,
    LIFT_MULTIPLIERS,
    MOUNT_MULTIPLIERS
} from "../domain/constants.js";
import {
    normalizeBoardDimensions,
    toDoubledCoordinates
} from "../domain/coordinates.js";
import {
    balloonTotal,
    validateBalloonCounts
} from "../domain/inventory.js";
import { buildProjectionSuffixBounds } from "./projectionBounds.js";

const EMPTY_LEVEL = 0;
const ASSIGNMENT_CATEGORIES = Object.freeze([
    EMPTY_LEVEL,
    ...BALLOON_LEVELS
]);
const CATEGORY_WEIGHTS = Object.freeze({
    [EMPTY_LEVEL]: 0,
    ...LIFT_MULTIPLIERS
});

export class SolverInputError extends Error {
    constructor(message) {
        super(message);
        this.name = "SolverInputError";
    }
}

export function validateSolverInput(input) {
    let dimensions;
    try {
        dimensions = normalizeBoardDimensions(
            input && (input.boardRows !== undefined
                || input.boardColumns !== undefined)
                ? { rows: input.boardRows, columns: input.boardColumns }
                : input?.boardSize
        );
    } catch (error) {
        throw new SolverInputError(error.message);
    }
    if (!Array.isArray(input.points)) {
        throw new SolverInputError("挂载点数据必须是数组");
    }
    if (input.points.length > dimensions.rows * dimensions.columns) {
        throw new SolverInputError("挂载点数量超过盘面容量");
    }

    const inventory = validateBalloonCounts(input.balloonCounts, {
        maximumTotal: input.points.length
    });
    if (!inventory.valid) {
        throw new SolverInputError(inventory.message);
    }

    const ids = new Set();
    const cells = new Set();
    const normalizedPoints = input.points.map((point) => {
        if (!point || typeof point.id !== "string" || point.id === "") {
            throw new SolverInputError("挂载点缺少有效标识");
        }
        if (ids.has(point.id)) {
            throw new SolverInputError("挂载点标识重复");
        }

        let coordinates;
        try {
            coordinates = toDoubledCoordinates(
                dimensions,
                point.row,
                point.column
            );
        } catch (error) {
            throw new SolverInputError(error.message);
        }

        const cellKey = `${point.row}:${point.column}`;
        if (cells.has(cellKey)) {
            throw new SolverInputError("挂载点坐标重复");
        }
        if ((point.x2 !== undefined && point.x2 !== coordinates.x2)
            || (point.y2 !== undefined && point.y2 !== coordinates.y2)) {
            throw new SolverInputError("挂载点双倍坐标与盘面坐标不一致");
        }
        const mountMultiplier = point.mountMultiplier;
        if (!MOUNT_MULTIPLIERS.includes(mountMultiplier)) {
            throw new SolverInputError("挂载倍率必须是 1、2 或 3");
        }

        ids.add(point.id);
        cells.add(cellKey);
        return {
            id: point.id,
            row: point.row,
            column: point.column,
            x2: coordinates.x2 * mountMultiplier,
            y2: coordinates.y2 * mountMultiplier,
            mountMultiplier
        };
    });

    return {
        boardRows: dimensions.rows,
        boardColumns: dimensions.columns,
        points: normalizedPoints,
        balloonCounts: Object.fromEntries(
            BALLOON_LEVELS.map((level) => [level, input.balloonCounts[level]])
        )
    };
}

function canonicalOppositePair(point) {
    const oppositeX = -point.x2;
    const oppositeY = -point.y2;
    const useOriginal = point.x2 < oppositeX
        || (point.x2 === oppositeX && point.y2 <= oppositeY);

    return useOriginal
        ? [point.x2, point.y2]
        : [oppositeX, oppositeY];
}

export function sortPoints(points) {
    return points
        .map((point) => {
            const [pairX, pairY] = canonicalOppositePair(point);
            return {
                ...point,
                pairX,
                pairY,
                manhattan: Math.abs(point.x2) + Math.abs(point.y2),
                radiusSquared: point.x2 * point.x2 + point.y2 * point.y2
            };
        })
        .sort((left, right) => {
            if (left.manhattan !== right.manhattan) {
                return right.manhattan - left.manhattan;
            }
            if (left.radiusSquared !== right.radiusSquared) {
                return right.radiusSquared - left.radiusSquared;
            }
            if (left.pairX !== right.pairX) {
                return left.pairX - right.pairX;
            }
            if (left.pairY !== right.pairY) {
                return left.pairY - right.pairY;
            }
            if (left.row !== right.row) {
                return left.row - right.row;
            }
            if (left.column !== right.column) {
                return left.column - right.column;
            }
            return left.id.localeCompare(right.id);
        });
}


function chooseBaselineCategory(counts, categories) {
    let baseline = categories[0];
    for (const category of categories.slice(1)) {
        if (counts[category] > counts[baseline]) {
            baseline = category;
        }
    }
    return baseline;
}

function emptyStats() {
    return {
        visitedStates: 0,
        memoHits: 0,
        boundPrunes: 0,
        projectionPrunes: 0,
        countPrunes: 0,
        failedStates: 0
    };
}

function passesGlobalParityCheck(input) {
    const hasAllOddAxis = input.boardRows % 2 === 0
        || input.boardColumns % 2 === 0;
    if (!hasAllOddAxis
        || input.points.some((point) => point.mountMultiplier % 2 === 0)) {
        return true;
    }

    const oddWeightCount = BALLOON_LEVELS
        .filter((level) => LIFT_MULTIPLIERS[level] % 2 !== 0)
        .reduce((sum, level) => sum + input.balloonCounts[level], 0);
    return oddWeightCount % 2 === 0;
}

function gcd(left, right) {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b !== 0) {
        const next = a % b;
        a = b;
        b = next;
    }
    return a;
}

function buildSuffixDivisors(points, alternatives, axis) {
    const divisors = new Int32Array(points.length + 1);
    for (let index = points.length - 1; index >= 0; index -= 1) {
        let divisor = divisors[index + 1];
        for (const alternative of alternatives) {
            divisor = gcd(
                divisor,
                alternative.delta * points[index][axis]
            );
        }
        divisors[index] = divisor;
    }
    return divisors;
}

function axisNeedIsDivisible(need, divisor) {
    return divisor === 0 ? need === 0 : need % divisor === 0;
}

function solveNonZeroPoints(points, counts) {
    const stats = emptyStats();
    if (points.length === 0) {
        return { solved: true, assignments: [], stats };
    }

    const usedCategories = ASSIGNMENT_CATEGORIES.filter(
        (category) => counts[category] > 0
    );
    if (usedCategories.length === 1) {
        const level = usedCategories[0];
        const weight = CATEGORY_WEIGHTS[level];
        let sumX = 0;
        let sumY = 0;
        for (const point of points) {
            sumX += weight * point.x2;
            sumY += weight * point.y2;
        }
        const solved = sumX === 0 && sumY === 0;
        return {
            solved,
            assignments: solved
                ? points.map((point) => ({ pointId: point.id, level }))
                : [],
            stats
        };
    }

    const baseline = chooseBaselineCategory(counts, usedCategories);
    const baselineWeight = CATEGORY_WEIGHTS[baseline];
    const alternatives = usedCategories
        .filter((level) => level !== baseline)
        .map((level) => ({
            level,
            count: counts[level],
            delta: CATEGORY_WEIGHTS[level] - baselineWeight
        }));
    const q = sortPoints(points);

    let baselineSumX = 0;
    let baselineSumY = 0;
    for (const point of q) {
        baselineSumX += baselineWeight * point.x2;
        baselineSumY += baselineWeight * point.y2;
    }
    const targetX = -baselineSumX;
    const targetY = -baselineSumY;
    const bounds = buildProjectionSuffixBounds(q, alternatives);
    const suffixDivisorX = buildSuffixDivisors(q, alternatives, "x2");
    const suffixDivisorY = buildSuffixDivisors(q, alternatives, "y2");
    const failedByIndex = Array.from(
        { length: q.length + 1 },
        () => new Set()
    );
    const selectedLevels = new Array(q.length).fill(baseline);

    function stateKey(remainingCounts, currentX, currentY) {
        return `${remainingCounts.join(",")}|${currentX}|${currentY}`;
    }

    function rememberFailure(index, key) {
        const failures = failedByIndex[index];
        if (!failures.has(key)) {
            failures.add(key);
            stats.failedStates += 1;
        }
    }

    function dfs(index, remainingCounts, currentX, currentY) {
        stats.visitedStates += 1;
        const remainingPoints = q.length - index;
        const remainingAlternativeCount = remainingCounts.reduce(
            (sum, count) => sum + count,
            0
        );

        if (remainingCounts.some((count) => count < 0)
            || remainingAlternativeCount > remainingPoints) {
            stats.countPrunes += 1;
            return false;
        }

        const key = stateKey(remainingCounts, currentX, currentY);
        if (failedByIndex[index].has(key)) {
            stats.memoHits += 1;
            return false;
        }

        if (index === q.length) {
            const solved = remainingAlternativeCount === 0
                && currentX === targetX
                && currentY === targetY;
            if (!solved) {
                rememberFailure(index, key);
            }
            return solved;
        }

        const needX = targetX - currentX;
        const needY = targetY - currentY;
        const reachable = bounds.get(index, remainingCounts);
        if (!reachable
            || needX < reachable.minX || needX > reachable.maxX
            || needY < reachable.minY || needY > reachable.maxY
            || !axisNeedIsDivisible(needX, suffixDivisorX[index])
            || !axisNeedIsDivisible(needY, suffixDivisorY[index])) {
            stats.boundPrunes += 1;
            rememberFailure(index, key);
            return false;
        }

        if (needX + needY < reachable.minPlus || needX + needY > reachable.maxPlus
            || needX - needY < reachable.minMinus || needX - needY > reachable.maxMinus) {
            stats.boundPrunes += 1;
            stats.projectionPrunes += 1;
            rememberFailure(index, key);
            return false;
        }

        if (remainingAlternativeCount === 0) {
            const solved = currentX === targetX && currentY === targetY;
            if (!solved) {
                rememberFailure(index, key);
            }
            return solved;
        }

        const point = q[index];
        const branches = [];
        if (remainingAlternativeCount < remainingPoints) {
            branches.push({
                level: baseline,
                coefficient: 0,
                nextCounts: remainingCounts
            });
        }
        for (let alternativeIndex = 0;
            alternativeIndex < alternatives.length;
            alternativeIndex += 1) {
            if (remainingCounts[alternativeIndex] === 0) {
                continue;
            }
            const alternative = alternatives[alternativeIndex];
            const nextCounts = remainingCounts.slice();
            nextCounts[alternativeIndex] -= 1;
            branches.push({
                level: alternative.level,
                coefficient: alternative.delta,
                nextCounts
            });
        }

        const previousPoint = q[index - 1];
        const followsOppositePoint = previousPoint
            && previousPoint.x2 === -point.x2
            && previousPoint.y2 === -point.y2;
        for (const branch of branches) {
            branch.nextX = currentX + branch.coefficient * point.x2;
            branch.nextY = currentY + branch.coefficient * point.y2;
            branch.distance = Math.abs(targetX - branch.nextX)
                + Math.abs(targetY - branch.nextY);
            branch.symmetryPenalty = followsOppositePoint
                && branch.level !== selectedLevels[index - 1]
                ? 1
                : 0;
        }
        branches.sort((left, right) => (
            left.symmetryPenalty - right.symmetryPenalty
            || left.distance - right.distance
            || left.level - right.level
        ));

        for (const branch of branches) {
            selectedLevels[index] = branch.level;
            if (dfs(
                index + 1,
                branch.nextCounts,
                branch.nextX,
                branch.nextY
            )) {
                return true;
            }
        }
        selectedLevels[index] = baseline;
        rememberFailure(index, key);
        return false;
    }

    const solved = dfs(
        0,
        alternatives.map(({ count }) => count),
        0,
        0
    );
    if (!solved) {
        return { solved: false, assignments: [], stats };
    }

    return {
        solved: true,
        assignments: q.map((point, index) => ({
            pointId: point.id,
            level: selectedLevels[index]
        })),
        stats
    };
}

function createCategoryCounts(input) {
    return {
        [EMPTY_LEVEL]: input.points.length - balloonTotal(input.balloonCounts),
        ...Object.fromEntries(
            BALLOON_LEVELS.map((level) => [level, input.balloonCounts[level]])
        )
    };
}

function enumerateZeroAllocations(zeroCount, counts) {
    const allocations = [];
    const current = Object.fromEntries(
        ASSIGNMENT_CATEGORIES.map((category) => [category, 0])
    );

    function dfs(categoryIndex, remaining) {
        const category = ASSIGNMENT_CATEGORIES[categoryIndex];
        if (categoryIndex === ASSIGNMENT_CATEGORIES.length - 1) {
            if (remaining <= counts[category]) {
                current[category] = remaining;
                allocations.push({ ...current });
                current[category] = 0;
            }
            return;
        }

        const max = Math.min(remaining, counts[category]);
        for (let amount = max; amount >= 0; amount -= 1) {
            current[category] = amount;
            dfs(categoryIndex + 1, remaining - amount);
        }
        current[category] = 0;
    }

    dfs(0, zeroCount);
    return allocations;
}

function assignZeroPoints(zeroPoints, allocation) {
    const assignments = [];
    let pointIndex = 0;
    for (const level of ASSIGNMENT_CATEGORIES) {
        for (let count = 0; count < allocation[level]; count += 1) {
            assignments.push({
                pointId: zeroPoints[pointIndex].id,
                level
            });
            pointIndex += 1;
        }
    }
    return assignments;
}

function selfVerify(input, assignments) {
    if (assignments.length !== balloonTotal(input.balloonCounts)) {
        return false;
    }
    const pointById = new Map(input.points.map((point) => [point.id, point]));
    const seen = new Set();
    const counts = Object.fromEntries(
        BALLOON_LEVELS.map((level) => [level, 0])
    );
    let sumX = 0;
    let sumY = 0;

    for (const assignment of assignments) {
        const point = pointById.get(assignment.pointId);
        if (!point || seen.has(assignment.pointId)
            || !BALLOON_LEVELS.includes(assignment.level)) {
            return false;
        }
        seen.add(assignment.pointId);
        counts[assignment.level] += 1;
        sumX += LIFT_MULTIPLIERS[assignment.level] * point.x2;
        sumY += LIFT_MULTIPLIERS[assignment.level] * point.y2;
    }

    return BALLOON_LEVELS.every(
        (level) => counts[level] === input.balloonCounts[level]
    ) && sumX === 0 && sumY === 0;
}

function mergeStats(total, branch) {
    for (const key of Object.keys(total)) {
        total[key] += branch[key] ?? 0;
    }
}

export function solveValidatedInput(input) {
    if (!passesGlobalParityCheck(input)) {
        return {
            status: "unsatisfiable",
            assignments: [],
            diagnostics: emptyStats()
        };
    }

    const zeroPoints = input.points
        .filter((point) => point.x2 === 0 && point.y2 === 0)
        .sort((left, right) => (
            left.row - right.row
            || left.column - right.column
            || left.id.localeCompare(right.id)
        ));
    const nonZeroPoints = input.points.filter(
        (point) => point.x2 !== 0 || point.y2 !== 0
    );
    const categoryCounts = createCategoryCounts(input);
    const zeroAllocations = enumerateZeroAllocations(
        zeroPoints.length,
        categoryCounts
    );
    const totalStats = emptyStats();

    for (const allocation of zeroAllocations) {
        const remainingCounts = Object.fromEntries(
            ASSIGNMENT_CATEGORIES.map((category) => [
                category,
                categoryCounts[category] - allocation[category]
            ])
        );
        const branch = solveNonZeroPoints(nonZeroPoints, remainingCounts);
        mergeStats(totalStats, branch.stats);
        if (!branch.solved) {
            continue;
        }

        const levelsByPoint = new Map(
            [...branch.assignments, ...assignZeroPoints(zeroPoints, allocation)]
                .map((assignment) => [assignment.pointId, assignment.level])
        );
        if (levelsByPoint.size !== input.points.length) {
            return {
                status: "error",
                message: "求解器内部结果重建失败",
                assignments: [],
                diagnostics: totalStats
            };
        }
        const assignments = input.points.flatMap((point) => {
            const level = levelsByPoint.get(point.id);
            return level === EMPTY_LEVEL ? [] : [{ pointId: point.id, level }];
        });

        if (!selfVerify(input, assignments)) {
            return {
                status: "error",
                message: "求解器内部结果校验失败",
                assignments: [],
                diagnostics: totalStats
            };
        }
        return {
            status: "solved",
            assignments,
            diagnostics: totalStats
        };
    }

    return {
        status: "unsatisfiable",
        assignments: [],
        diagnostics: totalStats
    };
}

export function solve(input) {
    try {
        return solveValidatedInput(validateSolverInput(input));
    } catch (error) {
        return {
            status: "error",
            message: error instanceof Error ? error.message : "未知求解错误",
            assignments: []
        };
    }
}
