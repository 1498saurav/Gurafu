import ELK from 'elkjs/lib/elk.bundled.js';
import * as d3 from 'd3';
const elk = new ELK();
export function sizeNodes(graph, mode) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '600 13px system-ui';
    return graph.nodes.map(n => {
        const labelWidth = Math.ceil(ctx.measureText(n.id).width);
        const source = n.definitions[0]?.table ?? 'Referenced only';
        const subtitle = source.length > 34 ? source.slice(0, 31) + '…' : source;
        ctx.font = '11px system-ui';
        const subtitleWidth = Math.ceil(ctx.measureText(subtitle).width);
        ctx.font = '600 13px system-ui';
        const width = mode === 'LIVE' ? Math.max(132, labelWidth + 30, subtitleWidth + 30) : mode === 'ENTERPRISE' ? Math.max(150, labelWidth + 36, subtitleWidth + 36) : Math.max(140, labelWidth + 36);
        return {
            ...n, labelWidth, subtitle, radius: 24, width, height: mode === 'LIVE' ? 42 : 54, shape: 'rect'
        };
    });
}
// The classic layout uses a live spring system, while Enterprise computes a stable layout.
export function createCardSimulation(nodes, edges, spacing, live = false) {
    const links = edges.map(e => ({
        ...e
    }));
    const pad = spacing * (live ? .18 : .42);
    const envelope = n => Math.hypot(n.width / 2, n.height / 2) + pad;
    return d3.forceSimulation(nodes).randomSource(d3.randomLcg(0.42))
        .force('link', d3.forceLink(links).id(n => n.id).distance(l => envelope(l.source) + envelope(l.target) + spacing * (live ? .24 : .6) + (live ? 8 : 42)).strength(l => (live ? .52 : .34) / Math.sqrt(Math.max(1, l.source.references.length / 3, l.target.references.length / 3))))
        .force('charge', d3.forceManyBody().strength(-Math.pow(spacing + 70, 2) * (live ? .035 : .09)))
        .force('collision', d3.forceCollide(envelope).strength(1).iterations(5))
        .force('x', d3.forceX(0).strength(live ? .003 : .012)).force('y', d3.forceY(0).strength(live ? .003 : .012))
        .velocityDecay(.45).stop();
}
export async function layoutGraph(graph, { mode = 'ENTERPRISE', spacing = 110 } = {}) {
    const nodes = sizeNodes(graph, mode), edges = graph.edges.map(e => ({
        ...e
    }));
    if (mode === 'ENTERPRISE' || mode === 'LIVE') {
        const simulation = createCardSimulation(nodes, edges, spacing, mode === 'LIVE');
        // Center only the initial graph, not the live drag simulation.
        simulation.force('center', d3.forceCenter(0, 0));
        simulation.tick(420);
        return {
            nodes, edges, mode, spacing
        };
    }
    const aliases = new Map(nodes.map((n, i) => [n.id, `n${i}`]));
    const result = await elk.layout({
        id: 'root', layoutOptions: {
            'elk.algorithm': 'layered', 'elk.direction': mode, 'elk.edgeRouting': 'ORTHOGONAL', 'elk.spacing.nodeNode': String(spacing), 'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing + 75), 'elk.layered.spacing.edgeNodeBetweenLayers': '28', 'elk.layered.spacing.edgeEdgeBetweenLayers': '20', 'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES', 'elk.padding': '[top=30,left=30,bottom=30,right=30]'
        }, children: nodes.map(n => ({
            id: aliases.get(n.id), width: n.width, height: n.height
        })), edges: edges.map(e => ({
            id: e.id, sources: [aliases.get(e.source)], targets: [aliases.get(e.target)], labels: [{
                    text: e.label, width: Math.max(48, e.label.length * 6.6 + 14), height: 20
                }]
        }))
    });
    const positions = new Map(result.children.map(n => [n.id, n]));
    const routes = new Map((result.edges ?? []).map(e => [e.id, e]));
    for (const n of nodes) {
        const p = positions.get(aliases.get(n.id));
        n.x = p.x + n.width / 2;
        n.y = p.y + n.height / 2;
    }
    for (const e of edges) {
        const r = routes.get(e.id), s = r?.sections?.[0], l = r?.labels?.[0];
        if (s)
            e.points = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint];
        if (l)
            e.labelPoint = {
                x: l.x + l.width / 2, y: l.y + l.height / 2
            };
    }
    return {
        nodes, edges, mode
    };
}
