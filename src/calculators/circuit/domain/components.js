function toCoordinate(value) {
    if (Array.isArray(value)) {
        return [Number(value[0]), Number(value[1])];
    }

    const [row, column] = String(value).split(",");
    return [Number(row), Number(column)];
}

export function isValidComponentShape(shape) {
    return Array.isArray(shape) && shape.length > 0 && Array.from(shape).every((cell) => {
        const values = Array.isArray(cell)
            ? cell
            : typeof cell === "string" ? cell.split(",") : [];
        return values.length === 2 && Array.from(values).every((value) => (
            (typeof value === "number" || (typeof value === "string" && value.trim() !== ""))
            && Number.isSafeInteger(Number(value))
        ));
    });
}

export function normalizeCoordinates(shape) {
    const coordinates = Array.from(shape ?? [], toCoordinate)
        .filter(([row, column]) => Number.isFinite(row) && Number.isFinite(column));

    if (coordinates.length === 0) {
        return [];
    }

    const minRow = Math.min(...coordinates.map(([row]) => row));
    const minColumn = Math.min(...coordinates.map(([, column]) => column));

    const uniqueCoordinates = new Map();
    for (const [row, column] of coordinates) {
        const normalized = [row - minRow, column - minColumn];
        uniqueCoordinates.set(`${normalized[0]},${normalized[1]}`, normalized);
    }

    return Array.from(uniqueCoordinates.values())
        .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
}

export function coordinatesKey(coordinates) {
    return coordinates.map(([row, column]) => `${row},${column}`).join("|");
}

export function getUniqueRotations(shape) {
    const normalized = normalizeCoordinates(shape);
    const transforms = [
        ([row, column]) => [row, column],
        ([row, column]) => [column, -row],
        ([row, column]) => [-row, -column],
        ([row, column]) => [-column, row]
    ];
    const seen = new Set();
    const rotations = [];

    for (const transform of transforms) {
        const coordinates = normalizeCoordinates(normalized.map(transform));
        const key = coordinatesKey(coordinates);
        if (!seen.has(key)) {
            seen.add(key);
            rotations.push(coordinates);
        }
    }

    return rotations;
}

export function sortComponents(components) {
    return components.sort((left, right) => {
        const leftArea = left.sizeRows * left.sizeCols;
        const rightArea = right.sizeRows * right.sizeCols;
        if (leftArea !== rightArea) return leftArea - rightArea;
        if (left.sizeRows !== right.sizeRows) return left.sizeRows - right.sizeRows;
        return left.sizeCols - right.sizeCols;
    });
}

export function createComponentModel(id, definition) {
    if (typeof id !== "string" || id === ""
        || !definition || typeof definition !== "object" || !isValidComponentShape(definition.shape)) {
        throw new TypeError(`组件 ${id} 的 shape 字段无效`);
    }

    const shape = normalizeCoordinates(definition.shape);
    const maxRow = Math.max(...shape.map(([row]) => row));
    const maxColumn = Math.max(...shape.map(([, column]) => column));

    return {
        id,
        name: definition.name || id,
        shape,
        shapeKeys: new Set(shape.map(([row, column]) => `${row},${column}`)),
        color: definition.color || "#b8c0ca",
        count: 0,
        count2: 0,
        sizeRows: maxRow + 1,
        sizeCols: maxColumn + 1,
        isCustom: false
    };
}

export function createComponentModels(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new TypeError("组件配置必须是对象");
    }

    return sortComponents(
        Object.entries(config).map(([id, definition]) => createComponentModel(id, definition))
    );
}

export function componentForSolver(component) {
    return {
        id: component.id,
        name: component.name,
        shape: component.shape.map((coordinate) => coordinate.slice()),
        color: component.color,
        count: Math.max(0, Number(component.count) || 0),
        count2: Math.max(0, Number(component.count2) || 0)
    };
}

function hashText(source) {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    const mask = 0xffffffffffffffffn;
    for (const character of source) {
        hash ^= BigInt(character.codePointAt(0));
        hash = (hash * prime) & mask;
    }
    return hash.toString(16).padStart(16, "0");
}

export function isGridConnected(grid) {
    const occupied = [];
    for (let row = 0; row < grid.length; row++) {
        for (let column = 0; column < (grid[row]?.length ?? 0); column++) {
            if (grid[row][column]) occupied.push([row, column]);
        }
    }

    if (occupied.length === 0) return false;

    const occupiedKeys = new Set(occupied.map(([row, column]) => `${row},${column}`));
    const visited = new Set([`${occupied[0][0]},${occupied[0][1]}`]);
    const q = [occupied[0]];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (let cursor = 0; cursor < q.length; cursor++) {
        const [row, column] = q[cursor];
        for (const [rowDelta, columnDelta] of directions) {
            const key = `${row + rowDelta},${column + columnDelta}`;
            if (occupiedKeys.has(key) && !visited.has(key)) {
                visited.add(key);
                q.push([row + rowDelta, column + columnDelta]);
            }
        }
    }

    return visited.size === occupied.length;
}

export function createCustomComponent(grid, sequence) {
    if (!isGridConnected(grid)) {
        throw new TypeError("自定义组件必须至少包含一个格子且保持四向连通");
    }

    const shape = [];
    for (let row = 0; row < grid.length; row++) {
        for (let column = 0; column < (grid[row]?.length ?? 0); column++) {
            if (grid[row][column]) shape.push([row, column]);
        }
    }

    const normalized = normalizeCoordinates(shape);
    const maxRow = Math.max(...normalized.map(([row]) => row));
    const maxColumn = Math.max(...normalized.map(([, column]) => column));
    const shapeHash = hashText(coordinatesKey(normalized));
    const hue = (Number.parseInt(shapeHash.slice(-6), 16) % 300) + 20;

    return {
        id: `customcomp_${shapeHash}`,
        name: `自定义组件${sequence}`,
        shape: normalized,
        shapeKeys: new Set(normalized.map(([row, column]) => `${row},${column}`)),
        color: `hsl(${hue} 62% 58%)`,
        count: 0,
        count2: 0,
        sizeRows: maxRow + 1,
        sizeCols: maxColumn + 1,
        isCustom: true
    };
}
