export function parsePresetId(id) {
    const parts = String(id).split("_");
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { region: parts[0], tab: parts[1] };
}

function isIntegerArray(value, length) {
    return Array.isArray(value)
        && value.length === length
        && value.every((item) => Number.isInteger(Number(item)));
}

export function validatePreset(preset) {
    if (!preset || typeof preset !== "object" || Array.isArray(preset)) {
        return "预设必须是对象";
    }

    const rows = Number(preset.n);
    const columns = Number(preset.m ?? preset.n);
    if (!Number.isInteger(rows) || rows < 1 || rows > 10
        || !Number.isInteger(columns) || columns < 1 || columns > 10) {
        return "预设棋盘尺寸无效";
    }
    if (!preset.name || typeof preset.name !== "string") return "预设名称无效";
    if (typeof preset.isType2Activated !== "boolean") return "预设组件类型开关无效";
    if (!preset.target || typeof preset.target !== "object") return "预设目标配置缺失";
    if (!isIntegerArray(preset.target.row, rows)
        || !isIntegerArray(preset.target.col, columns)) {
        return "预设第一类目标配置无效";
    }
    if (!isIntegerArray(preset.target.row2, rows)) {
        return "预设第二类行目标配置无效";
    }
    if (!isIntegerArray(preset.target.col2, columns)) {
        return "预设第二类列目标配置无效";
    }
    if (preset.target.row.some((value) => Number(value) < 0 || Number(value) > columns)
        || preset.target.row2.some((value) => Number(value) < 0 || Number(value) > columns)
        || preset.target.col.some((value) => Number(value) < 0 || Number(value) > rows)
        || preset.target.col2.some((value) => Number(value) < 0 || Number(value) > rows)) {
        return "预设目标数字超出棋盘范围";
    }
    if (!Array.isArray(preset.gridCell) || !Array.isArray(preset.component)) {
        return "预设棋盘或组件配置无效";
    }

    const occupiedCells = new Set();
    for (const cell of preset.gridCell) {
        if (!Number.isInteger(cell?.r) || !Number.isInteger(cell?.c)
            || cell.r < 0 || cell.r >= rows || cell.c < 0 || cell.c >= columns
            || ![0, 1, 2, 3].includes(Number(cell.state))) {
            return "预设包含无效棋盘格";
        }
        const key = `${cell.r},${cell.c}`;
        if (occupiedCells.has(key)) return "预设包含重复棋盘格";
        occupiedCells.add(key);
    }

    const componentIds = new Set();
    for (const component of preset.component) {
        const count = Number(component?.count ?? 0);
        const count2 = Number(component?.count2 ?? 0);
        if (!component?.id || !Number.isInteger(count) || count < 0 || count > 6
            || !Number.isInteger(count2) || count2 < 0 || count2 > 6) {
            return "预设包含无效组件配置";
        }
        if (componentIds.has(component.id)) return "预设包含重复组件配置";
        componentIds.add(component.id);
    }

    return "";
}

export function groupPresets(presets, searchText = "") {
    const grouped = Object.create(null);
    const query = searchText.trim().toLocaleLowerCase("zh-CN");

    for (const [id, preset] of Object.entries(presets ?? {})) {
        const parsed = parsePresetId(id);
        if (!parsed || validatePreset(preset)) continue;
        if (query && !preset.name.toLocaleLowerCase("zh-CN").includes(query)) continue;

        grouped[parsed.region] ??= Object.create(null);
        grouped[parsed.region][parsed.tab] ??= [];
        grouped[parsed.region][parsed.tab].push({ id, name: preset.name, preset });
    }

    for (const tabGroups of Object.values(grouped)) {
        for (const items of Object.values(tabGroups)) {
            items.sort((left, right) => left.name.localeCompare(right.name, "zh-CN", {
                numeric: true
            }));
        }
    }

    return grouped;
}
