<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
    calculators: {
        type: Array,
        required: true
    },
    activeId: {
        type: String,
        required: true
    }
});

const emit = defineEmits(["select", "preload"]);
const tabList = ref(null);
const tabButtons = ref([]);
const tabSizes = ref([]);
const tabHeight = 56;
const tabWing = 22;
let resizeObserver;

function taperedFoot(startX, direction, height) {
    const round = (value) => Math.round(value * 100000) / 100000;
    const x = (offset) => round(startX + direction * offset);
    const shoulderRun = 12;
    const shoulderRise = height - 20;
    const length = Math.hypot(shoulderRun, shoulderRise);
    const normalX = shoulderRise / length * 0.5;
    const normalY = shoulderRun / length * 0.5;
    const overlapX = shoulderRun / length * 0.2;
    const overlapY = shoulderRise / length * 0.2;
    const footTop = height - 10;
    const outerControl = normalX + (5.85 + normalY) * shoulderRun / shoulderRise;
    const innerControl = -normalX + (6.15 - normalY) * shoulderRun / shoulderRise;
    return `M${x(normalX - overlapX)} ${round(footTop - normalY - overlapY)}L${x(normalX)} ${round(footTop - normalY)}C${x(outerControl)} ${round(height - 4.15)} ${x(4.5)} ${round(height - 0.9)} ${x(11)} ${round(height - 0.9)}V${height}C${x(4.5)} ${height} ${x(innerControl)} ${round(height - 3.85)} ${x(-normalX)} ${round(footTop + normalY)}L${x(-normalX - overlapX)} ${round(footTop + normalY - overlapY)}Z`;
}

const tabShapes = computed(() => props.calculators.map((calculator, index) => {
    const leftWing = index > 0;
    const rightWing = index < props.calculators.length - 1;
    const height = tabSizes.value[index]?.height ?? tabHeight;
    const footTop = height - 10;
    const fillControl = 11 - 6 * 12 / (height - 20);
    const width = (tabSizes.value[index]?.width ?? 210)
        + (Number(leftWing) + Number(rightWing)) * tabWing;
    const leftShoulder = "L23 10C25 3.5 29 .5 36 .5";
    const left = leftWing
        ? `M11 ${footTop}${leftShoulder}`
        : `M.5 ${height}V9.5A9 9 0 0 1 9.5 .5`;
    const right = rightWing
        ? `H${width - 36}C${width - 29} .5 ${width - 25} 3.5 ${width - 23} 10L${width - 11} ${footTop}`
        : `H${width - 9.5}A9 9 0 0 1 ${width - 0.5} 9.5V${height}`;
    const fillStart = leftWing
        ? `M0 ${height}V${height - 0.5}C6.5 ${height - 0.5} ${fillControl} ${height - 4} 11 ${footTop}${leftShoulder}` : left;
    const fillEnd = rightWing
        ? `C${width - fillControl} ${height - 4} ${width - 6.5} ${height - 0.5} ${width} ${height - 0.5}V${height}` : "";
    return {
        width,
        height,
        edge: left + right,
        fill: `${fillStart}${right}${fillEnd}Z`,
        feet: [
            leftWing ? taperedFoot(11, -1, height) : "",
            rightWing ? taperedFoot(width - 11, 1, height) : ""
        ].join(""),
        base: `M.5 ${height - 0.5}H${width - 0.5}`,
        style: {
            left: leftWing ? `-${tabWing}px` : "0",
            width: `calc(100% + ${(Number(leftWing) + Number(rightWing)) * tabWing}px)`
        }
    };
}));

function measureTabs() {
    const sizes = props.calculators.map((_, index) => {
        const button = tabButtons.value[index];
        const width = button?.getBoundingClientRect().width;
        const height = button?.querySelector(".calculator-tab__shape")
            ?.getBoundingClientRect().height;
        return {
            width: width > 0 ? width : (tabSizes.value[index]?.width ?? 210),
            height: height >= 32 ? height : (tabSizes.value[index]?.height ?? tabHeight)
        };
    });
    if (sizes.some(({ width, height }, index) => (
        width !== tabSizes.value[index]?.width
        || height !== tabSizes.value[index]?.height
    ))) {
        tabSizes.value = sizes;
    }
}

onMounted(() => {
    measureTabs();
    resizeObserver = new ResizeObserver(measureTabs);
    resizeObserver.observe(tabList.value);
    tabButtons.value.forEach((button) => {
        resizeObserver.observe(button);
        resizeObserver.observe(button.querySelector(".calculator-tab__shape"));
    });
});

onBeforeUnmount(() => resizeObserver?.disconnect());

function select(id) {
    if (id !== props.activeId) {
        emit("select", id);
    }
}

function handleKeydown(event, index) {
    const lastIndex = props.calculators.length - 1;
    let nextIndex = null;
    if (event.key === "ArrowRight") {
        nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft") {
        nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
        nextIndex = 0;
    } else if (event.key === "End") {
        nextIndex = lastIndex;
    }

    if (nextIndex === null) {
        return;
    }
    event.preventDefault();
    const calculator = props.calculators[nextIndex];
    select(calculator.id);
    tabButtons.value[nextIndex]?.focus();
}
</script>

<template>
    <nav
        class="calculator-nav"
        :data-active-id="activeId"
        aria-label="解密计算器"
    >
        <div
            ref="tabList"
            class="calculator-tabs"
            role="tablist"
            aria-label="选择解密玩法"
            aria-orientation="horizontal"
        >
            <button
                v-for="(calculator, index) in calculators"
                :id="`calculator-tab-${calculator.id}`"
                :key="calculator.id"
                :ref="(element) => tabButtons[index] = element"
                class="calculator-tab"
                :class="{ 'calculator-tab--active': calculator.id === activeId }"
                type="button"
                role="tab"
                :aria-selected="calculator.id === activeId"
                :aria-controls="`calculator-panel-${calculator.id}`"
                :tabindex="calculator.id === activeId ? 0 : -1"
                @pointerenter="emit('preload', calculator.id)"
                @focus="emit('preload', calculator.id)"
                @click="select(calculator.id)"
                @keydown="handleKeydown($event, index)"
            >
                <span class="calculator-tab__label">{{ calculator.label }}</span>
                <svg
                    class="calculator-tab__shape"
                    :style="tabShapes[index].style"
                    :viewBox="`0 0 ${tabShapes[index].width} ${tabShapes[index].height}`"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                >
                    <defs>
                        <linearGradient
                            :id="`calculator-tab-shape-${calculator.id}`"
                            x1="0"
                            y1="0"
                            x2="0"
                            :y2="tabShapes[index].height"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop
                                class="calculator-tab__shape-stop calculator-tab__shape-stop--top"
                                offset="0"
                            ></stop>
                            <stop
                                class="calculator-tab__shape-stop calculator-tab__shape-stop--middle"
                                offset="0.5"
                            ></stop>
                            <stop
                                class="calculator-tab__shape-stop calculator-tab__shape-stop--bottom"
                                offset="0.8"
                            ></stop>
                        </linearGradient>
                        <linearGradient
                            :id="`calculator-tab-foot-${calculator.id}`"
                            x1="0"
                            :y1="tabShapes[index].height - 10"
                            x2="0"
                            :y2="tabShapes[index].height"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop class="calculator-tab__foot-start" offset="0"></stop>
                            <stop class="calculator-tab__foot-end" offset="1"></stop>
                        </linearGradient>
                        <radialGradient
                            :id="`calculator-tab-light-${calculator.id}`"
                            cx="48%"
                            cy="0%"
                            r="85%"
                        >
                            <stop class="calculator-tab__light-color" offset="0" stop-opacity="0.45"></stop>
                            <stop class="calculator-tab__light-color" offset="0.75" stop-opacity="0"></stop>
                        </radialGradient>
                    </defs>
                    <path
                        class="calculator-tab__shape-fill"
                        :fill="`url(#calculator-tab-shape-${calculator.id})`"
                        :d="tabShapes[index].fill"
                    ></path>
                    <path
                        class="calculator-tab__shape-light"
                        :fill="`url(#calculator-tab-light-${calculator.id})`"
                        :d="tabShapes[index].fill"
                    ></path>
                    <path
                        class="calculator-tab__shape-edge"
                        :d="tabShapes[index].edge"
                    ></path>
                    <path
                        class="calculator-tab__shape-foot"
                        :fill="`url(#calculator-tab-foot-${calculator.id})`"
                        :d="tabShapes[index].feet"
                    ></path>
                    <path
                        class="calculator-tab__shape-base"
                        :d="tabShapes[index].base"
                    ></path>
                </svg>
            </button>
        </div>
    </nav>
</template>
