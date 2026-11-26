// Pure geometry helpers for placing labels without covering nodes or other labels.
const rect = (x, y, w, h) => ({
    left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2
});
const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
export function placeEdgeLabels(nodes, edges, routes, measure, priority = new Set()) {
    const obstacles = nodes.flatMap(n => n.shape === 'rect' ? [rect(n.x, n.y, n.width + 12, n.height + 12)] : [rect(n.x, n.y, 2 * n.radius + 8, 2 * n.radius + 8), rect(n.x, n.y + n.radius + 15, n.labelWidth + 12, 20)]);
    const placed = [];
    const result = new Map();
    const ordered = edges.slice().sort((a, b) => Number(priority.has(b.id)) - Number(priority.has(a.id)) || a.id.localeCompare(b.id));
    for (const e of ordered) {
        const route = routes.get(e.id);
        if (!route)
            continue;
        const width = measure(e) + 12;
        const candidates = route.candidates ?? [route.label];
        let best = null;
        for (const p of candidates) {
            const box = rect(p.x, p.y, width, 18);
            if (!obstacles.some(o => intersects(o, box)) && !placed.some(o => intersects(o, box))) {
                best = {
                    ...p, clear: true
                };
                placed.push(box);
                break;
            }
        }
        result.set(e.id, best ?? {
            ...candidates[0], clear: false
        });
    }
    return result;
}
