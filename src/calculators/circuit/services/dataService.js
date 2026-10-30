import { createComponentModels } from "../domain/components.js";

const prefetchedData = {
    components: null,
    presets: null
};

async function fetchJson(path, label, fetchImplementation = fetch) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetchImplementation(`${path}${separator}t=${Date.now()}`, {
        cache: "no-store"
    });
    if (!response.ok) {
        throw new Error(`${label}加载失败（HTTP ${response.status}）`);
    }
    return response.json();
}

function ensurePrefetched(key, path, label) {
    if (!prefetchedData[key]) {
        const request = fetchJson(path, label).catch((error) => {
            if (prefetchedData[key] === request) {
                prefetchedData[key] = null;
            }
            throw error;
        });
        prefetchedData[key] = request;
    }
    return prefetchedData[key];
}

function takePrefetched(key, path, label) {
    const request = prefetchedData[key] ?? fetchJson(path, label);
    prefetchedData[key] = null;
    return request;
}

export function preloadCircuitData() {
    return Promise.all([
        ensurePrefetched("components", "./config.json", "组件定义"),
        ensurePrefetched("presets", "./presets.json", "攻略预设")
    ]);
}

export async function loadComponentConfig(fetchImplementation) {
    const config = await (fetchImplementation
        ? fetchJson("./config.json", "组件定义", fetchImplementation)
        : takePrefetched("components", "./config.json", "组件定义"));
    return createComponentModels(config);
}

export async function loadPresetData(fetchImplementation) {
    const presets = await (fetchImplementation
        ? fetchJson("./presets.json", "攻略预设", fetchImplementation)
        : takePrefetched("presets", "./presets.json", "攻略预设"));
    if (!presets || typeof presets !== "object" || Array.isArray(presets)) {
        throw new TypeError("预设文件格式无效");
    }
    return presets;
}
