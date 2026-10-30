<script setup>
import {
    computed,
    nextTick,
    onActivated,
    onBeforeUnmount,
    onDeactivated,
    onMounted,
    ref,
    watch
} from "vue";
import {
    BALLOON_LABELS,
    BALLOON_LEVELS,
    LIFT_MULTIPLIERS,
    MOUNT_MULTIPLIERS
} from "../domain/constants.js";
import MountPointGlyph from "./MountPointGlyph.vue";
import RecoveryBalloonIcon from "./RecoveryBalloonIcon.vue";

const props = defineProps({
    active: {
        type: Boolean,
        default: true
    },
    rows: {
        type: Number,
        required: true
    },
    columns: {
        type: Number,
        required: true
    },
    cells: {
        type: Array,
        required: true
    },
    assignments: {
        type: Object,
        required: true
    },
    mountMultiplierMode: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits(["toggle", "set-multiplier"]);
let globalListenersActive = false;
const gridStyle = computed(() => ({
    "--board-columns": props.columns
}));
const activeCellIndex = ref(null);
const activeCellButton = ref(null);
const optionBubble = ref(null);
const optionBubbleStyle = ref({});
const optionBubblePlacement = ref("below");

const multiplierOptions = Object.freeze([
    {
        key: "blank",
        value: null,
        description: "不可挂载"
    },
    {
        key: "2",
        value: 2,
        description: "升力倍率2"
    },
    {
        key: "3",
        value: 3,
        description: "升力倍率3"
    }
]);

const mountLegendItems = Object.freeze([
    { multiplier: 1, label: "挂载点 · 1 倍" },
    { multiplier: 2, label: "挂载点 · 2 倍" },
    { multiplier: 3, label: "挂载点 · 3 倍" }
]);

function assignedLevel(cell) {
    return props.assignments[cell.id] ?? null;
}

function hasMountMarker(cell) {
    return Boolean(cell)
        && MOUNT_MULTIPLIERS.includes(cell.mountMultiplier);
}

function cellLabel(cell) {
    const level = assignedLevel(cell);
    const position = `第 ${cell.row + 1} 行，第 ${cell.column + 1} 列`;
    if (level) {
        return `${position}，${cell.mountMultiplier} 倍挂载点，升力倍率 ${cell.mountMultiplier}，${BALLOON_LABELS[level]}`;
    }
    if (hasMountMarker(cell)) {
        const action = props.mountMultiplierMode
            ? "点击选择挂载状态"
            : "点击清空";
        return `${position}，${cell.mountMultiplier} 倍挂载点，升力倍率 ${cell.mountMultiplier}，${action}`;
    }
    return `${position}，普通格，点击设置挂载点`;
}

function isCenter(cell) {
    return cell.row * 2 === props.rows - 1
        && cell.column * 2 === props.columns - 1;
}

function placeOptionBubble() {
    if (activeCellIndex.value === null || !activeCellButton.value
        || !optionBubble.value) {
        return;
    }

    const anchor = activeCellButton.value.getBoundingClientRect();
    const width = optionBubble.value.offsetWidth || 248;
    const height = optionBubble.value.offsetHeight || 190;
    const gap = 9;
    const edge = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const anchorCenter = anchor.left + anchor.width / 2;
    const centeredLeft = anchorCenter - width / 2;
    const left = Math.min(
        Math.max(centeredLeft, edge),
        Math.max(edge, viewportWidth - width - edge)
    );
    const fitsBelow = anchor.bottom + gap + height <= viewportHeight - edge;
    optionBubblePlacement.value = fitsBelow ? "below" : "above";
    const top = fitsBelow
        ? anchor.bottom + gap
        : Math.max(edge, anchor.top - height - gap);
    const arrowLeft = Math.min(
        Math.max(anchorCenter - left, 18),
        width - 18
    );

    optionBubbleStyle.value = {
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        "--mount-options-arrow-left": `${Math.round(arrowLeft)}px`
    };
}

function closeOptionBubble({ restoreFocus = false } = {}) {
    const button = activeCellButton.value;
    activeCellIndex.value = null;
    activeCellButton.value = null;
    optionBubbleStyle.value = {};
    optionBubblePlacement.value = "below";
    if (restoreFocus) {
        nextTick(() => button?.focus());
    }
}

async function openOptionBubble(index, button) {
    activeCellIndex.value = index;
    activeCellButton.value = button;
    await nextTick();
    placeOptionBubble();
    const currentMultiplier = props.cells[index]?.mountMultiplier;
    const currentOption = MOUNT_MULTIPLIERS.includes(currentMultiplier)
        ? optionBubble.value?.querySelector(
            `[data-multiplier-option="${currentMultiplier}"]`
        )
        : null;
    (currentOption || optionBubble.value?.querySelector("button"))?.focus();
}

function handleCellClick(cell, index, event) {
    if (props.mountMultiplierMode && hasMountMarker(cell)) {
        if (activeCellIndex.value === index) {
            closeOptionBubble({ restoreFocus: true });
            return;
        }
        openOptionBubble(index, event.currentTarget);
        return;
    }

    closeOptionBubble();
    emit("toggle", index);
}

function handleCellContextMenu(cell, index, event) {
    event.preventDefault();
    closeOptionBubble();
    if (hasMountMarker(cell)) {
        emit("set-multiplier", index, null);
    }
}

function isCurrentOption(option) {
    if (activeCellIndex.value === null) {
        return false;
    }
    return option.value !== null
        && props.cells[activeCellIndex.value]?.mountMultiplier === option.value;
}

function handleOptionKeydown(event) {
    if (!optionBubble.value || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }
    if (event.key === "2" || event.key === "3") {
        event.preventDefault();
        chooseMultiplier(Number(event.key));
        return;
    }

    const buttons = [...optionBubble.value.querySelectorAll(
        ".mount-options__item"
    )];
    if (buttons.length === 0) {
        return;
    }
    const currentIndex = buttons.indexOf(document.activeElement);
    let nextIndex = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = currentIndex < 0
            ? 0
            : (currentIndex + 1) % buttons.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextIndex = currentIndex < 0
            ? buttons.length - 1
            : (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === "Home") {
        nextIndex = 0;
    } else if (event.key === "End") {
        nextIndex = buttons.length - 1;
    }
    if (nextIndex !== null && buttons[nextIndex]) {
        event.preventDefault();
        buttons[nextIndex].focus();
    }
}

function chooseMultiplier(multiplier) {
    if (activeCellIndex.value === null) {
        return;
    }
    emit("set-multiplier", activeCellIndex.value, multiplier);
    closeOptionBubble({ restoreFocus: true });
}

function handleDocumentPointerDown(event) {
    if (activeCellIndex.value === null
        || optionBubble.value?.contains(event.target)
        || activeCellButton.value?.contains(event.target)) {
        return;
    }
    closeOptionBubble();
}

function handleDocumentFocusIn(event) {
    if (activeCellIndex.value === null
        || optionBubble.value?.contains(event.target)
        || activeCellButton.value?.contains(event.target)) {
        return;
    }
    closeOptionBubble();
}

function handleViewportScroll() {
    closeOptionBubble();
}

function startGlobalListeners() {
    if (globalListenersActive) {
        return;
    }
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("focusin", handleDocumentFocusIn, true);
    window.addEventListener("resize", placeOptionBubble);
    window.addEventListener("scroll", handleViewportScroll, true);
    globalListenersActive = true;
}

function stopGlobalListeners() {
    if (!globalListenersActive) {
        return;
    }
    document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    document.removeEventListener("focusin", handleDocumentFocusIn, true);
    window.removeEventListener("resize", placeOptionBubble);
    window.removeEventListener("scroll", handleViewportScroll, true);
    globalListenersActive = false;
}

function syncGlobalListeners() {
    if (props.active) {
        startGlobalListeners();
        return;
    }
    closeOptionBubble();
    stopGlobalListeners();
}

onMounted(syncGlobalListeners);
onActivated(syncGlobalListeners);
onDeactivated(() => {
    closeOptionBubble();
    stopGlobalListeners();
});
onBeforeUnmount(stopGlobalListeners);

watch(() => props.active, syncGlobalListeners);
watch(() => props.mountMultiplierMode, (enabled) => {
    if (!enabled) {
        closeOptionBubble({ restoreFocus: true });
    }
});
watch(
    () => [props.rows, props.columns],
    () => closeOptionBubble({ restoreFocus: true })
);
watch(() => props.cells, () => {
    if (activeCellIndex.value !== null
        && !hasMountMarker(props.cells[activeCellIndex.value])) {
        closeOptionBubble({ restoreFocus: true });
    }
});
</script>

<template>
    <section class="board-panel" aria-labelledby="board-heading">
        <div class="section-heading section-heading--board">
            <div>
                <span class="section-heading__index">02</span>
                <h2 id="board-heading">挂载点设定</h2>
            </div>
            <span class="board-size-badge">{{ rows }} × {{ columns }}</span>
        </div>

        <div class="board-scroll" tabindex="0" aria-label="棋盘滚动区域">
            <div
                class="board-grid"
                :style="gridStyle"
                role="grid"
                aria-keyshortcuts="Control+Z Meta+Z"
                :aria-rowcount="rows"
                :aria-colcount="columns"
            >
                <button
                    v-for="(cell, index) in cells"
                    :key="cell.id"
                    class="board-cell puzzle-cell"
                    :class="{
                        'puzzle-cell--empty': !hasMountMarker(cell),
                        'board-cell--mount': hasMountMarker(cell),
                        'board-cell--assigned': assignedLevel(cell),
                        [`board-cell--level-${assignedLevel(cell)}`]: assignedLevel(cell),
                        [`board-cell--multiplier-${cell.mountMultiplier}`]: hasMountMarker(cell),
                        'board-cell--center': isCenter(cell)
                    }"
                    type="button"
                    role="gridcell"
                    :aria-label="cellLabel(cell)"
                    :aria-haspopup="mountMultiplierMode && hasMountMarker(cell)
                        ? 'dialog'
                        : undefined"
                    :aria-expanded="mountMultiplierMode && hasMountMarker(cell)
                        ? activeCellIndex === index
                        : undefined"
                    :aria-controls="activeCellIndex === index
                        ? 'mount-multiplier-options'
                        : undefined"
                    :data-cell-id="cell.id"
                    :data-mount-multiplier="cell.mountMultiplier"
                    data-testid="board-cell"
                    @click="handleCellClick(cell, index, $event)"
                    @contextmenu="handleCellContextMenu(cell, index, $event)"
                    @keydown.esc.stop="closeOptionBubble({ restoreFocus: true })"
                >
                    <Transition name="board-token" mode="out-in">
                        <span
                            v-if="hasMountMarker(cell)"
                            :key="`mount-${cell.mountMultiplier}`"
                            class="mount-marker"
                        >
                            <MountPointGlyph :multiplier="cell.mountMultiplier" />
                        </span>
                        <span
                            v-else
                            key="plain"
                            class="board-cell__coordinate"
                            aria-hidden="true"
                        >
                            {{ cell.row + 1 }}·{{ cell.column + 1 }}
                        </span>
                    </Transition>
                    <Transition name="board-token">
                        <span
                            v-if="assignedLevel(cell)"
                            :key="`balloon-${assignedLevel(cell)}`"
                            class="deployed-balloon"
                        >
                            <RecoveryBalloonIcon
                                :level="assignedLevel(cell)"
                                variant="board"
                            />
                        </span>
                    </Transition>
                </button>
            </div>
        </div>

        <div
            class="level-legend"
            role="group"
            aria-label="棋盘图例"
        >
            <template v-if="mountMultiplierMode">
                <span
                    v-for="item in mountLegendItems"
                    :key="item.multiplier"
                    class="level-legend__item level-legend__item--mount"
                >
                    <MountPointGlyph :multiplier="item.multiplier" />
                    <span>{{ item.label }}</span>
                </span>
            </template>
            <span
                v-else
                class="level-legend__item level-legend__item--mount"
            >
                <MountPointGlyph />
                <span>挂载点</span>
            </span>
            <span
                v-for="level in BALLOON_LEVELS"
                :key="level"
                class="level-legend__item"
                :class="`level-legend__item--${level}`"
            >
                <RecoveryBalloonIcon :level="level" variant="legend" />
                <span>{{ level }}级 · 升力{{ LIFT_MULTIPLIERS[level] }}</span>
            </span>
        </div>

        <Teleport to="body">
            <div class="floating-overlay-scope">
                <Transition name="mount-options">
                    <div
                        v-if="activeCellIndex !== null"
                        id="mount-multiplier-options"
                        ref="optionBubble"
                        class="mount-options"
                        :class="`mount-options--${optionBubblePlacement}`"
                        :style="optionBubbleStyle"
                        role="dialog"
                        aria-label="选择挂载状态"
                        aria-keyshortcuts="2 3 ArrowDown ArrowUp ArrowLeft ArrowRight Home End Escape"
                        @keydown="handleOptionKeydown"
                        @keydown.esc.stop="closeOptionBubble({ restoreFocus: true })"
                    >
                        <button
                            v-for="option in multiplierOptions"
                            :key="option.key"
                            class="mount-options__item"
                            :class="{
                                'mount-options__item--current': isCurrentOption(option)
                            }"
                            type="button"
                            :aria-current="isCurrentOption(option) ? 'true' : undefined"
                            :data-multiplier-option="option.key"
                            @click="chooseMultiplier(option.value)"
                        >
                            <span
                                v-if="option.value === null"
                                class="mount-options__blank-cell"
                                aria-hidden="true"
                            ></span>
                            <MountPointGlyph
                                v-else
                                :multiplier="option.value"
                            />
                            <span class="mount-options__copy">
                                <small>{{ option.description }}</small>
                            </span>
                        </button>
                    </div>
                </Transition>
            </div>
        </Teleport>
    </section>
</template>
