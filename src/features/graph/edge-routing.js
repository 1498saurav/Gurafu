function boundary(n, dx, dy) {
    const ratio = 1 / Math.max(Math.abs(dx) / (n.width / 2), Math.abs(dy) / (n.height / 2), 1e-9);
    return {
        x: n.x + dx * ratio, y: n.y + dy * ratio
    };
}
export function curve(e, lookup, edges) {
    const a = lookup.get(e.source), b = lookup.get(e.target);
    if (a === b) {
        const x = a.x, y = a.y, w = a.width / 2, h = a.height / 2;
        const siblings = edges.filter(v => v.source === e.source && v.target === e.target);
        const extra = siblings.findIndex(v => v.id === e.id) * 28;
        return {
            d: `M${x + w},${y} C${x + w + 75 + extra},${y - 75 - extra} ${x - w - 75 - extra},${y - 75 - extra} ${x - w},${y}`, label: {
                x, y: y - h - 42 - extra
            }
        };
    }
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
    const siblings = edges.filter(x => (x.source === e.source && x.target === e.target) || (x.source === e.target && x.target === e.source));
    const index = siblings.findIndex(x => x.id === e.id);
    const offset = (index - (siblings.length - 1) / 2) * 56 * (e.source.localeCompare(e.target) <= 0 ? 1 : -1);
    const c = {
        x: (a.x + b.x) / 2 - dy / dist * offset, y: (a.y + b.y) / 2 + dx / dist * offset
    };
    const p = boundary(a, c.x - a.x, c.y - a.y), q = boundary(b, c.x - b.x, c.y - b.y);
    const point = t => ({
        x: (1 - t) ** 2 * p.x + 2 * t * (1 - t) * c.x + t * t * q.x, y: (1 - t) ** 2 * p.y + 2 * t * (1 - t) * c.y + t * t * q.y
    });
    return {
        d: `M${p.x},${p.y} Q${c.x},${c.y} ${q.x},${q.y}`, label: point(.5), candidates: [.5, .38, .62, .26, .74].map(t => {
            const r = point(t);
            return {
                x: r.x, y: r.y - 10
            };
        })
    };
}
