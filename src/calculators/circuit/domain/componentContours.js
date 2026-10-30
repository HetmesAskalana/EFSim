const SIDE_EDGES = [
    { dr: -1, dc: 0, start: (row, column) => [column, row], end: (row, column) => [column + 1, row], direction: 0 },
    { dr: 0, dc: 1, start: (row, column) => [column + 1, row], end: (row, column) => [column + 1, row + 1], direction: 1 },
    { dr: 1, dc: 0, start: (row, column) => [column + 1, row + 1], end: (row, column) => [column, row + 1], direction: 2 },
    { dr: 0, dc: -1, start: (row, column) => [column, row + 1], end: (row, column) => [column, row], direction: 3 }
];

function coordinateKey(row, column) {
    return `${row},${column}`;
}

function pointKey(point) {
    return `${point.x},${point.y}`;
}

function simplifyCycle(points) {
    if (points.length <= 4) return points;
    return points.filter((point, index) => {
        const previous = points[(index - 1 + points.length) % points.length];
        const next = points[(index + 1) % points.length];
        return !(
            (previous.x === point.x && point.x === next.x)
            || (previous.y === point.y && point.y === next.y)
        );
    });
}

function traceCycles(edges) {
    const byStart = new Map();
    for (const edge of edges) {
        const key = pointKey(edge.start);
        const candidates = byStart.get(key) ?? [];
        candidates.push(edge);
        byStart.set(key, candidates);
    }

    const unused = new Set(edges);
    const cycles = [];
    while (unused.size) {
        const first = unused.values().next().value;
        const startKey = pointKey(first.start);
        const points = [first.start];
        let current = first;

        while (current) {
            unused.delete(current);
            points.push(current.end);
            const endKey = pointKey(current.end);
            if (endKey === startKey) break;

            const candidates = (byStart.get(endKey) ?? []).filter((edge) => unused.has(edge));
            const turnPriority = [1, 0, 3, 2];
            candidates.sort((left, right) => {
                const leftTurn = (left.direction - current.direction + 4) % 4;
                const rightTurn = (right.direction - current.direction + 4) % 4;
                return turnPriority.indexOf(leftTurn) - turnPriority.indexOf(rightTurn);
            });
            current = candidates[0];
        }

        if (pointKey(points.at(-1)) !== startKey) {
            throw new Error("组件轮廓无法闭合");
        }
        cycles.push(simplifyCycle(points.slice(0, -1)));
    }
    return cycles;
}

function formatCoordinate(value) {
    return Number(value.toFixed(4)).toString();
}

function roundedCyclePath(points, requestedRadius) {
    if (points.length < 4) throw new Error("组件轮廓顶点不足");
    const rounded = points.map((point, index) => {
        const previous = points[(index - 1 + points.length) % points.length];
        const next = points[(index + 1) % points.length];
        const previousLength = Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y);
        const nextLength = Math.abs(next.x - point.x) + Math.abs(next.y - point.y);
        const radius = Math.min(requestedRadius, previousLength / 2, nextLength / 2);
        const before = {
            x: point.x + Math.sign(previous.x - point.x) * radius,
            y: point.y + Math.sign(previous.y - point.y) * radius
        };
        const after = {
            x: point.x + Math.sign(next.x - point.x) * radius,
            y: point.y + Math.sign(next.y - point.y) * radius
        };
        return { point, before, after };
    });

    const first = rounded[0];
    const commands = [
        `M ${formatCoordinate(first.before.x)} ${formatCoordinate(first.before.y)}`,
        `Q ${formatCoordinate(first.point.x)} ${formatCoordinate(first.point.y)} `
            + `${formatCoordinate(first.after.x)} ${formatCoordinate(first.after.y)}`
    ];
    for (const corner of rounded.slice(1)) {
        commands.push(`L ${formatCoordinate(corner.before.x)} ${formatCoordinate(corner.before.y)}`);
        commands.push(
            `Q ${formatCoordinate(corner.point.x)} ${formatCoordinate(corner.point.y)} `
                + `${formatCoordinate(corner.after.x)} ${formatCoordinate(corner.after.y)}`
        );
    }
    commands.push("Z");
    return commands.join(" ");
}

function boundaryEdges(group) {
    const occupied = new Set(group.cells.map((cell) => coordinateKey(cell.row, cell.column)));
    const edges = [];
    for (const cell of group.cells) {
        for (const side of SIDE_EDGES) {
            if (occupied.has(coordinateKey(cell.row + side.dr, cell.column + side.dc))) continue;
            const [startX, startY] = side.start(cell.row, cell.column);
            const [endX, endY] = side.end(cell.row, cell.column);
            edges.push({
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
                direction: side.direction
            });
        }
    }
    return edges;
}

export function buildComponentContours(cells, cornerRadius = 0.1) {
    const groups = new Map();
    for (const cell of cells) {
        if (!cell.placed) continue;
        let group = groups.get(cell.componentInstanceId);
        if (!group) {
            group = {
                instanceId: cell.componentInstanceId,
                state: cell.state,
                cells: [],
                anchorRow: cell.row,
                anchorColumn: cell.column
            };
            groups.set(cell.componentInstanceId, group);
        }
        group.cells.push(cell);
        if (
            cell.row < group.anchorRow
            || (cell.row === group.anchorRow && cell.column < group.anchorColumn)
        ) {
            group.anchorRow = cell.row;
            group.anchorColumn = cell.column;
        }
    }

    return [...groups.values()].map((group) => {
        const cycles = traceCycles(boundaryEdges(group));
        return {
            instanceId: group.instanceId,
            state: group.state,
            anchorRow: group.anchorRow,
            anchorColumn: group.anchorColumn,
            path: cycles.map((cycle) => roundedCyclePath(cycle, cornerRadius)).join(" ")
        };
    });
}
