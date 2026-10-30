import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { calculatorStyleScopes } from "./scripts/calculator-style-scopes.mjs";

export default defineConfig({
    plugins: [vue()],
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true
    },
    preview: {
        host: "0.0.0.0",
        port: 4173,
        strictPort: true
    },
    css: {
        postcss: {
            plugins: [calculatorStyleScopes()]
        }
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        cssCodeSplit: false,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    const normalizedId = id.replaceAll("\\", "/");
                    if (normalizedId.includes("/src/calculators/circuit/")
                        || normalizedId.includes("/src/calculators/floating/")) {
                        return "App";
                    }
                    return undefined;
                }
            }
        }
    }
});
