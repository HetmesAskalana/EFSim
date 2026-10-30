<script setup>
defineProps({
    index: { type: String, required: true },
    title: { type: String, required: true }
});
</script>

<template>
    <div class="section-heading">
        <div class="section-heading__title">
            <span class="section-heading__index">{{ index }}</span>
            <h2><slot name="title">{{ title }}</slot></h2>
        </div>
        <slot name="aside"></slot>
    </div>
</template>
