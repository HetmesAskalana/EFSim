import { defineAsyncComponent, markRaw } from "vue";
import CalculatorLoading from "../components/CalculatorLoading.vue";
import CalculatorLoadError from "../components/CalculatorLoadError.vue";

const loadCalculatorApps = () => import("./apps.js");
const loadCircuitCalculator = () => loadCalculatorApps().then(
    (module) => module.CircuitCalculator
);
const loadFloatingCalculator = () => loadCalculatorApps().then(
    (module) => module.FloatingCalculator
);
const asyncCalculator = (loader) => defineAsyncComponent({
    loader,
    loadingComponent: CalculatorLoading,
    errorComponent: CalculatorLoadError,
    delay: 80,
    timeout: 15000
});

const CALCULATOR_PRELOADERS = Object.freeze({
    circuit: async () => {
        const [calculatorModule, dataService] = await Promise.all([
            loadCircuitCalculator(),
            import("./circuit/services/dataService.js")
        ]);
        await dataService.preloadCircuitData();
        return calculatorModule;
    },
    floating: loadFloatingCalculator
});
const preloadRequests = new Map();

export const CALCULATORS = Object.freeze([
    {
        id: "circuit",
        hash: "CIRCUIT",
        shortLabel: "EC",
        label: "电路修复",
        component: markRaw(asyncCalculator(loadCircuitCalculator))
    },
    {
        id: "floating",
        hash: "SKYHOOK",
        shortLabel: "SH",
        label: "浮空回收",
        component: markRaw(asyncCalculator(loadFloatingCalculator))
    }
]);

export function findCalculator(id) {
    return CALCULATORS.find((calculator) => calculator.id === id);
}

export function preloadCalculator(id) {
    const loader = CALCULATOR_PRELOADERS[id];
    if (!loader) {
        return Promise.resolve(null);
    }
    if (preloadRequests.has(id)) {
        return preloadRequests.get(id);
    }

    const request = Promise.resolve()
        .then(loader)
        .catch((error) => {
            if (preloadRequests.get(id) === request) {
                preloadRequests.delete(id);
            }
            throw error;
        });
    preloadRequests.set(id, request);
    return request;
}
