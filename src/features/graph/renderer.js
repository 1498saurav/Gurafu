import * as d3 from 'd3';
import { $, status } from '../../shared/dom.js';
import { neighborhood } from '../../domain/graph-model.js';
import { createCardSimulation } from './layout.js';
import { placeEdgeLabels } from './edge-labels.js';
import { curve } from './edge-routing.js';
// Rendering owns SVG selections and live simulation; application owns imported mappings.
export function createGraphRenderer({ state, svg, viewport, zoom, panMode, select }) {
    let nodesSel, edgesSel, hitSel, labelsSel;
    const live = () => state.layout?.mode === 'LIVE';
    const enterprise = () => state.layout?.mode === 'ENTERPRISE' || live();
    let liveSimulation = null;
    function stopLive() {
        if (liveSimulation) {
            liveSimulation.stop();
            liveSimulation = null;
        }
    }
    let edgeLabelPlacements = new Map();
    const measurementContext = document.createElement('canvas').getContext('2d');
    measurementContext.font = '11px system-ui';
    function render() {
        viewport.selectAll('*').remove();
        const { nodes, edges } = state.layout;
        edgesSel = viewport.append('g').selectAll('path').data(edges, d => d.id).join('path').attr('class', 'edge').attr('marker-end', 'url(#arrow)');
        hitSel = viewport.append('g').selectAll('path').data(edges, d => d.id).join('path').attr('class', 'edge-hit').on('click', (ev, e) => {
            if (panMode())
                return;
            ev.stopPropagation();
            select({
                kind: 'edge', id: e.id
            });
        });
        labelsSel = viewport.append('g').selectAll('text').data(edges, d => d.id).join('text').attr('class', 'edge-label').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').text(d => d.label).on('click', (ev, e) => {
            if (panMode())
                return;
            ev.stopPropagation();
            select({
                kind: 'edge', id: e.id
            });
        });
        nodesSel = viewport.append('g').selectAll('g').data(nodes, d => d.id).join('g').attr('class', d => `node${d.definitions.length ? '' : ' undefined'}${enterprise() ? ' enterprise-node' : ''}`).attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => d.id).on('keydown', (ev, n) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                select({
                    kind: 'node', id: n.id
                });
            }
        }).on('click', (ev, n) => {
            if (panMode())
                return;
            ev.stopPropagation();
            select({
                kind: 'node', id: n.id
            });
        }).call(d3.drag().filter(ev => !panMode() && !ev.ctrlKey && !ev.button).clickDistance(4).container(() => viewport.node()).subject((ev, n) => n).on('start', () => {
            svg.interrupt();
            $('canvas').classList.add('moving-node');
        }).on('drag', (ev, n) => {
            n.x = ev.x;
            n.y = ev.y;
            state.dragged.add(n.id);
            if (live() && liveSimulation) {
                n.fx = ev.x;
                n.fy = ev.y;
                n.vx = 0;
                n.vy = 0;
                liveSimulation.alphaTarget(.22).restart();
            }
            drawPositions();
            highlight();
        }).on('end', (ev) => {
            $('canvas').classList.remove('moving-node');
            if (live() && liveSimulation && !ev.active) {
                liveSimulation.alphaTarget(0);
            }
            status(live() ? 'Node pinned · Connected graph settles · Auto layout to reset' : 'Manual positions retained · Auto layout to reset');
        }));
        {
            nodesSel.append('rect').attr('class', 'node-box').attr('x', n => -n.width / 2).attr('y', n => -n.height / 2).attr('width', n => n.width).attr('height', n => n.height).attr('rx', live() ? 14 : enterprise() ? 15 : 7);
            nodesSel.append('text').attr('class', 'node-name').attr('text-anchor', 'middle').attr('y', live() ? -2 : -3).text(n => n.id);
            nodesSel.append('text').attr('class', 'node-meta').attr('text-anchor', 'middle').attr('y', live() ? 12 : 14).text(n => enterprise() ? n.subtitle : n.definitions.length ? `${n.references.length} relationship${n.references.length === 1 ? '' : 's'}` : 'Referenced only');
        }
        nodesSel.append('title').text(n => enterprise() ? [n.id, ...new Set(n.definitions.map(d => d.table))].join('\n') : n.id);
        drawPositions();
        highlight();
    }
    function drawPositions() {
        const lookup = new Map(state.layout.nodes.map(n => [n.id, n]));
        const routes = new Map(state.layout.edges.map(e => {
            if (e.points?.length && !state.dragged.has(e.source) && !state.dragged.has(e.target)) {
                const pts = e.points, mid = pts[Math.floor(pts.length / 2)];
                return [e.id, {
                        d: d3.line().x(p => p.x).y(p => p.y)(pts), label: e.labelPoint ?? mid
                    }];
            }
            return [e.id, curve(e, lookup, state.layout.edges)];
        }));
        edgesSel.attr('d', e => routes.get(e.id).d);
        hitSel.attr('d', e => routes.get(e.id).d);
        nodesSel.attr('transform', n => `translate(${n.x},${n.y})`);
        edgeLabelPlacements = routes;
    }
    function positionLabels(activeEdges = new Set()) {
        if (!labelsSel || !state.layout)
            return;
        if (enterprise()) {
            const placements = placeEdgeLabels(state.layout.nodes, state.layout.edges, edgeLabelPlacements, e => measurementContext.measureText(e.label).width, activeEdges);
            labelsSel.attr('x', e => placements.get(e.id)?.x ?? 0).attr('y', e => placements.get(e.id)?.y ?? 0).classed('overlap', e => !placements.get(e.id)?.clear);
        }
        else
            labelsSel.attr('x', e => edgeLabelPlacements.get(e.id).label.x).attr('y', e => edgeLabelPlacements.get(e.id).label.y).classed('overlap', false);
    }
    function fit() {
        if (!state.layout?.nodes.length)
            return;
        const bounds = viewport.node().getBBox(), rect = $('canvas').getBoundingClientRect();
        const k = Math.min(1.25, Math.max(.05, .88 * Math.min(rect.width / Math.max(1, bounds.width), rect.height / Math.max(1, bounds.height))));
        svg.transition().duration(260).call(zoom.transform, d3.zoomIdentity.translate(rect.width / 2 - k * (bounds.x + bounds.width / 2), rect.height / 2 - k * (bounds.y + bounds.height / 2)).scale(k));
    }
    function highlight() {
        if (!nodesSel || !state.graph)
            return;
        const s = state.selected, term = $('search').value.trim().toLowerCase();
        const matching = new Set(), matchingEdges = new Set();
        if (term) {
            for (const n of state.graph.nodes)
                if (n.id.toLowerCase().includes(term))
                    matching.add(n.id);
            for (const e of state.graph.edges)
                if ([e.label, e.source, e.target].some(v => v.toLowerCase().includes(term))) {
                    matchingEdges.add(e.id);
                    matching.add(e.source);
                    matching.add(e.target);
                }
        }
        let activeNodes = new Set(), activeEdges = new Set();
        if (s?.kind === 'node') {
            const hood = neighborhood(state.graph, s.id);
            activeNodes = hood.nodes;
            activeEdges = new Set(hood.edges.map(e => e.id));
        }
        else if (s?.kind === 'edge') {
            const e = state.graph.edges.find(e => e.id === s.id);
            if (e) {
                activeNodes = new Set([e.source, e.target]);
                activeEdges.add(e.id);
            }
        }
        const nodeDim = n => (!!term && !matching.has(n.id)) || (!!s && !activeNodes.has(n.id));
        const edgeDim = e => (!!term && !matchingEdges.has(e.id)) || (!!s && !activeEdges.has(e.id));
        nodesSel.classed('dim', nodeDim).classed('selected', n => s?.kind === 'node' && s.id === n.id);
        edgesSel.classed('dim', edgeDim).classed('active', e => activeEdges.has(e.id)).attr('marker-end', e => activeEdges.has(e.id) ? 'url(#arrowActive)' : 'url(#arrow)');
        positionLabels(activeEdges);
        labelsSel.classed('dim', edgeDim).attr('display', function (e) {
            const mode = $('labels').value;
            return mode === 'none' || (mode === 'focus' && !activeEdges.has(e.id)) || (mode === 'auto' && ((s && !activeEdges.has(e.id)) || (!activeEdges.has(e.id) && d3.select(this).classed('overlap')))) ? 'none' : null;
        });
    }
    function startLive() {
        if (live()) {
            liveSimulation = createCardSimulation(state.layout.nodes, state.layout.edges, state.layout.spacing, true).on('tick', () => {
                drawPositions();
                highlight();
            });
        }
    }
    function clearGraph() {
        viewport.selectAll('*').remove();
        nodesSel = edgesSel = hitSel = labelsSel = null;
        edgeLabelPlacements.clear();
    }
    return {
        render, highlight, fit, stopLive, startLive, clearGraph
    };
}
