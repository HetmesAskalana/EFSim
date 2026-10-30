<script setup>
defineProps({
    multiplier: {
        type: Number,
        default: 1,
        validator: (value) => [1, 2, 3].includes(value)
    }
});
</script>

<template>
    <span
        class="mount-point-glyph"
        :class="`mount-point-glyph--${multiplier}`"
        :data-mount-multiplier="multiplier"
        aria-hidden="true"
    >
        <svg
            class="mount-point-glyph__drawing"
            viewBox="0 0 100 88"
            focusable="false"
        >
            <path
                class="mount-point-glyph__depth"
                d="M12 8H37V17H63V8H88V80H63V71H37V80H12Z"
            ></path>
            <path
                class="mount-point-glyph__outer-line"
                d="M9 5H38V14H62V5H91V83H62V74H38V83H9Z"
            ></path>
            <path
                class="mount-point-glyph__plate"
                d="M14 9H38V19H62V9H86V79H62V69H38V79H14Z"
            ></path>
            <path class="mount-point-glyph__grid-line" d="M14 44H86M50 19V69"></path>
            <path
                class="mount-point-glyph__edge-detail"
                d="M14 15H20M14 73H20M80 15H86M80 73H86"
            ></path>
            <g class="mount-point-glyph__target">
                <circle cx="50" cy="44" r="10"></circle>
                <circle cx="50" cy="44" r="6"></circle>
            </g>
            <g
                v-if="multiplier >= 2"
                class="mount-point-glyph__badge"
            >
                <rect x="66" y="3" width="31" height="20" rx="5"></rect>
                <text x="81.5" y="17">×{{ multiplier }}</text>
            </g>
        </svg>
    </span>
</template>
