import {
    BALLOON_LEVELS,
    MAX_BALLOON_COUNT
} from "./constants.js";

export function createEmptyBalloonCounts() {
    return Object.fromEntries(BALLOON_LEVELS.map((level) => [level, 0]));
}

export function balloonTotal(counts) {
    return BALLOON_LEVELS.reduce(
        (sum, level) => sum + Number(counts?.[level] ?? 0),
        0
    );
}

export function normalizeBalloonCount(rawValue, max = MAX_BALLOON_COUNT) {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
        return 0;
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return Math.min(max, Math.max(0, Math.floor(numericValue)));
}

export function validateBalloonCounts(
    counts,
    { maximumTotal = MAX_BALLOON_COUNT } = {}
) {
    for (const level of BALLOON_LEVELS) {
        const count = counts?.[level];
        if (!Number.isInteger(count) || count < 0 || count > MAX_BALLOON_COUNT) {
            return {
                valid: false,
                message: `${level} 级回收气球数量无效`
            };
        }
    }

    const total = balloonTotal(counts);
    if (total > maximumTotal) {
        return {
            valid: false,
            message: "回收气球总数不能超过挂载点数量"
        };
    }

    return { valid: true, total, message: "" };
}
