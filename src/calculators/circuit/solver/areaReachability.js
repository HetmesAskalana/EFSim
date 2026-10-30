export function buildAreaReachability(items, limit) {
    const remaining = new Int32Array(limit + 1).fill(-1);
    remaining[0] = 0;
    for (const { area, count } of items) {
        if (count <= 0 || area > limit) continue;
        const cappedCount = Math.min(count, Math.floor(limit / area));
        for (let sum = 0; sum <= limit; sum++) {
            if (remaining[sum] >= 0) {
                remaining[sum] = cappedCount;
            } else if (sum >= area && remaining[sum - area] > 0) {
                remaining[sum] = remaining[sum - area] - 1;
            }
        }
    }
    return Uint8Array.from(remaining, (count) => Number(count >= 0));
}

export function buildSuffixAreaReachability(instances, type, limit) {
    const suffix = new Array(instances.length + 1);
    suffix[instances.length] = new Uint8Array(limit + 1);
    suffix[instances.length][0] = 1;
    for (let index = instances.length - 1; index >= 0; index--) {
        const next = suffix[index + 1];
        if (instances[index].type !== type) {
            suffix[index] = next;
            continue;
        }
        const reachable = next.slice();
        const area = instances[index].area;
        for (let sum = area; sum <= limit; sum++) {
            reachable[sum] |= next[sum - area];
        }
        suffix[index] = reachable;
    }
    return suffix;
}
