<script setup>
import SectionHeading from "./SectionHeading.vue";

defineProps({
    groupedPresets: { type: Object, required: true },
    searchText: { type: String, required: true },
    selectedPresetId: { type: String, default: null },
    expandedRegions: { type: Set, required: true },
    expandedTabs: { type: Map, required: true },
    regionMap: { type: Object, required: true },
    tabMap: { type: Object, required: true },
    matchCount: { type: Number, required: true },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
});

const emit = defineEmits([
    "update:search-text",
    "toggle-region",
    "toggle-tab",
    "select",
    "apply",
    "refresh",
    "import"
]);
</script>

<template>
    <section class="preset-panel panel-section" aria-labelledby="preset-heading">
        <SectionHeading index="TU" title="攻略预设">
            <template #title><span id="preset-heading">攻略预设</span></template>
        </SectionHeading>

        <div class="preset-layout">
            <div class="preset-browser">
                <label class="search-field">
                    <span class="visually-hidden">搜索预设名称</span>
                    <span class="search-field__icon" aria-hidden="true"></span>
                    <input
                        :value="searchText"
                        type="search"
                        placeholder="搜索预设名称..."
                        :disabled="disabled"
                        @input="emit('update:search-text', $event.target.value)"
                    >
                </label>

                <div class="preset-tree" :aria-busy="loading">
                    <div v-if="loading" class="catalog-placeholder">
                        <span class="loading-spinner" aria-hidden="true"></span>正在读取攻略预设…
                    </div>
                    <div v-else-if="Object.keys(groupedPresets).length === 0" class="catalog-placeholder">
                        {{ searchText ? '没有找到匹配的预设' : '暂无可用预设' }}
                    </div>
                    <div v-for="region in Object.keys(groupedPresets).sort()" :key="region" class="preset-region">
                        <button
                            class="preset-tree__region"
                            type="button"
                            :aria-expanded="expandedRegions.has(region)"
                            :disabled="disabled"
                            @click="emit('toggle-region', region)"
                        >
                            <span class="tree-chevron" aria-hidden="true"></span>
                            <strong>{{ regionMap[region] || region }}</strong>
                        </button>
                        <div v-if="expandedRegions.has(region)" class="preset-region__tabs">
                            <div v-for="tab in Object.keys(groupedPresets[region]).sort()" :key="tab" class="preset-tab">
                                <button
                                    class="preset-tree__tab"
                                    type="button"
                                    :aria-expanded="expandedTabs.get(region)?.has(tab) || false"
                                    :disabled="disabled"
                                    @click="emit('toggle-tab', region, tab)"
                                >
                                    <span class="tree-chevron" aria-hidden="true"></span>
                                    <span>{{ tabMap[tab] || tab }}</span>
                                </button>
                                <div v-if="expandedTabs.get(region)?.has(tab)" class="preset-items">
                                    <button
                                        v-for="preset in groupedPresets[region][tab]"
                                        :key="preset.id"
                                        class="preset-item"
                                        :class="{ 'preset-item--selected': selectedPresetId === preset.id }"
                                        type="button"
                                        :aria-pressed="selectedPresetId === preset.id"
                                        :disabled="disabled"
                                        @click="emit('select', preset.id)"
                                    >
                                        <span>{{ preset.name }}</span>
                                        <i aria-hidden="true"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <aside class="preset-actions">
                <button
                    class="button button--primary"
                    type="button"
                    :disabled="disabled || !selectedPresetId"
                    @click="emit('apply')"
                >应用预设</button>
                <div class="preset-actions__secondary">
                    <button class="button button--ghost" type="button" :disabled="disabled" @click="emit('import')">
                        导入 JSON
                    </button>
                    <button class="button button--ghost" type="button" :disabled="disabled" @click="emit('refresh')">
                        刷新列表
                    </button>
                </div>
            </aside>
        </div>
    </section>
</template>
