export const STYLE_SCOPES = Object.freeze([
    {
        path: "/src/calculators/circuit/styles/main.css",
        selector: ":where(.circuit-repair, .circuit-overlay-scope)",
        roots: [".circuit-repair", ".circuit-overlay-scope"]
    },
    {
        path: "/src/calculators/floating/styles/main.css",
        selector: ":where(.floating-recovery, .floating-overlay-scope)",
        roots: [".floating-recovery", ".floating-overlay-scope"]
    }
]);

function isKeyframeRule(rule) {
    return rule.parent?.type === "atrule"
        && /keyframes$/i.test(rule.parent.name);
}

function hasFeatureRoot(selector, roots) {
    return roots.some((root) => (
        selector === root
        || selector.startsWith(`${root} `)
        || selector.startsWith(`${root}:`)
        || selector.startsWith(`${root}.`)
        || selector.startsWith(`${root}[`)
        || selector.startsWith(`${root} >`)
        || selector.startsWith(`${root} +`)
        || selector.startsWith(`${root} ~`)
    ));
}

export function scopeFeatureSelector(selector, { selector: scope, roots }) {
    const normalized = selector.trim();
    if (["html", "body", "body.dialog-open", "#app"].includes(normalized)) {
        return null;
    }
    if (normalized === ":root") {
        return scope;
    }
    if (normalized === ':root[data-theme="dark"]') {
        return `html[data-theme="dark"] ${scope}`;
    }

    const darkPrefix = 'html[data-theme="dark"]';
    if (normalized.startsWith(darkPrefix)) {
        const remainder = normalized.slice(darkPrefix.length).trim();
        if (!remainder || remainder === "body") {
            return null;
        }
        if (hasFeatureRoot(remainder, roots)) {
            return normalized;
        }
        return `${darkPrefix} ${scope} ${remainder}`;
    }
    if (hasFeatureRoot(normalized, roots)) {
        return normalized;
    }
    return `${scope} ${normalized}`;
}

export function calculatorStyleScopes() {
    return {
        postcssPlugin: "calculator-style-scopes",
        Once(root) {
            const sourcePath = root.source?.input?.file?.replaceAll("\\", "/") ?? "";
            const styleScope = STYLE_SCOPES.find(({ path }) => sourcePath.endsWith(path));
            if (!styleScope) {
                return;
            }

            root.walkRules((rule) => {
                if (isKeyframeRule(rule)) {
                    return;
                }
                const selectors = rule.selectors
                    .map((selector) => scopeFeatureSelector(selector, styleScope))
                    .filter(Boolean);
                if (selectors.length === 0) {
                    rule.remove();
                    return;
                }
                rule.selectors = selectors;
            });
        }
    };
}
