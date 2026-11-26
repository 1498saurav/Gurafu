// Conservative limits for an interactive, browser-local workspace.
export const LIMITS = Object.freeze({
    fileBytes: 5 * 1024 * 1024,
    batchBytes: 20 * 1024 * 1024,
    files: 50,
    depth: 48,
    values: 250_000,
    tables: 2000,
    nodes: 500,
    edges: 2000,
    labelLength: 256,
});

// Only plain JSON-like values are accepted. Reject shared/cyclic references,
// unsafe object keys and oversized structures before downstream serialization.
export function validateMappingData(root) {
    const seen = new WeakSet();
    const stack = [{ value: root, depth: 0 }];
    let count = 0;
    while (stack.length) {
        const { value, depth } = stack.pop();
        if (++count > LIMITS.values || depth > LIMITS.depth) {
            throw new Error('Mapping exceeds structural limits.');
        }
        if (value === null || typeof value === 'string' || typeof value === 'boolean') continue;
        if (typeof value === 'number' && Number.isFinite(value)) continue;
        if (typeof value !== 'object' || seen.has(value)) {
            throw new Error('Unsupported mapping value or shared/cyclic reference.');
        }
        seen.add(value);
        if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
            throw new Error('Only plain mapping objects are supported.');
        }
        for (const [key, child] of Object.entries(value)) {
            if (['__proto__', 'constructor', 'prototype'].includes(key)) {
                throw new Error('Unsafe mapping key.');
            }
            stack.push({ value: child, depth: depth + 1 });
        }
    }
    return root;
}
