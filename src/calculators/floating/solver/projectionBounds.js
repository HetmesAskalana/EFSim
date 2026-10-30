const PROJECTIONS = Object.freeze([
    { x: 1, y: 0, min: "minX", max: "maxX" },
    { x: 0, y: 1, min: "minY", max: "maxY" },
    { x: 1, y: 1, min: "minPlus", max: "maxPlus" },
    { x: 1, y: -1, min: "minMinus", max: "maxMinus" }
]);

function insertExtreme(sorted, value, capacity, ascending) {
    let index = 0;
    while (index < sorted.length && (ascending ? sorted[index] < value : sorted[index] > value)) index++;
    if (index >= capacity) return;
    sorted.splice(index, 0, value);
    if (sorted.length > capacity) sorted.pop();
}

function prefixSums(values) {
    const prefix = new Float64Array(values.length + 1);
    for (let index = 0; index < values.length; index++) prefix[index + 1] = prefix[index] + values[index];
    return prefix;
}

export function buildProjectionSuffixBounds(points, alternatives) {
    const categoryOrder = alternatives.map(({ delta }, index) => ({ index, delta }))
        .filter(({ delta }) => delta !== 0)
        .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || left.index - right.index);
    const capacity = Math.min(points.length, alternatives.reduce((sum, { count }) => sum + count, 0));

    const tables = PROJECTIONS.map((projection) => {
        const suffix = new Array(points.length + 1);
        suffix[points.length] = { low: new Float64Array(1), high: new Float64Array(1) };
        const lowest = [];
        const highest = [];
        for (let index = points.length - 1; index >= 0; index--) {
            const value = projection.x * points[index].x2 + projection.y * points[index].y2;
            insertExtreme(lowest, value, capacity, true);
            insertExtreme(highest, value, capacity, false);
            suffix[index] = { low: prefixSums(lowest), high: prefixSums(highest) };
        }
        return { projection, suffix };
    });

    return {
        get(index, remainingCounts) {
            if (!Number.isInteger(index) || index < 0 || index > points.length
                || remainingCounts.length !== alternatives.length) return null;
            const length = points.length - index;
            let alternativeTotal = 0;
            for (let category = 0; category < alternatives.length; category++) {
                const count = remainingCounts[category];
                if (!Number.isInteger(count) || count < 0 || count > alternatives[category].count) {
                    return null;
                }
                alternativeTotal += count;
            }
            if (alternativeTotal > length) return null;

            const result = {};
            for (const { projection, suffix } of tables) {
                const { low, high } = suffix[index];
                let negativeCursor = 0;
                let positiveCursor = 0;
                let min = 0;
                let max = 0;
                for (const category of categoryOrder) {
                    const count = remainingCounts[category.index];
                    const cursor = category.delta < 0 ? negativeCursor : positiveCursor;
                    const lowSum = low[cursor + count] - low[cursor];
                    const highSum = high[cursor + count] - high[cursor];
                    if (category.delta < 0) {
                        min += category.delta * highSum;
                        max += category.delta * lowSum;
                        negativeCursor += count;
                    } else {
                        min += category.delta * lowSum;
                        max += category.delta * highSum;
                        positiveCursor += count;
                    }
                }
                result[projection.min] = min;
                result[projection.max] = max;
            }
            return result;
        }
    };
}
