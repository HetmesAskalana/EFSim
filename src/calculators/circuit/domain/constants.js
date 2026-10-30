export const BOARD_MINIMUM = 1;
export const BOARD_MAXIMUM = 10;
export const COMPONENT_COUNT_MAXIMUM = 6;

export const REGION_MAP = Object.freeze({
    V4: "四号谷地",
    WL: "武陵"
});

export const REGION_TYPE_LABELS = Object.freeze({
    V4: Object.freeze({ type1: "绿色", type2: "蓝色" }),
    WL: Object.freeze({ type1: "青色", type2: "橙色" })
});

export const TAB_MAP = Object.freeze({
    EXP: "探索解密",
    BOT: "Delta 机器人"
});

export const CELL_STATE = Object.freeze({
    EMPTY: 0,
    DISABLED: 1,
    LOCKED: 2,
    RELOCKED: 3
});

export function boardCellSize(rows, columns) {
    const longestSide = Math.max(Number(rows), Number(columns));
    if (longestSide <= 4) return 62;
    if (longestSide <= 6) return 56;
    if (longestSide <= 8) return 50;
    return 44;
}
