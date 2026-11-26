import * as d3 from 'd3';
import * as yaml from 'js-yaml';
import sample from '../../example.yaml?raw';
import { $, el, notice, status, download } from '../shared/dom.js';
import { buildGraph, sinksOf } from '../domain/graph-model.js';
import { mergeMappings, sourceWarnings } from '../domain/mapping-bundle.js';
import { layoutGraph } from '../features/graph/layout.js';
import { createGraphRenderer } from '../features/graph/renderer.js';
import { createPanels } from '../features/inspector/panels.js';
import { parse, prepareImport } from '../features/import/yaml-import.js';
import { exportSvg } from '../features/graph/svg-export.js';
const state = {
    config: null, graph: null, layout: null, selected: null, tab: 'nodes', generation: 0, dragged: new Set(), tool: 'move', spaceHeld: false, previousLayout: 'ENTERPRISE'
};
const svg = d3.select('#graph'), defs = svg.append('defs');
for (const [id, color] of [['arrow', '#8799ad'], ['arrowActive', '#2358b9']])
    defs.append('marker').attr('id', id).attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto').append('path').attr('d', 'M0 0 L10 5 L0 10 Z').attr('fill', color);
const panMode = () => state.tool === 'pan' || state.spaceHeld;
const viewport = svg.append('g'), zoom = d3.zoom().scaleExtent([.05, 4]).clickDistance(4).on('start', () => {
    $('canvas').classList.add('panning');
}).on('end', () => {
    $('canvas').classList.remove('panning');
}).on('zoom', e => {
    viewport.attr('transform', e.transform);
    $('zoomValue').textContent = `${Math.round(e.transform.k * 100)}%`;
});
svg.call(zoom).on('click', () => {
    if (!panMode())
        select(null);
});
const { render, highlight, fit, stopLive, startLive, clearGraph } = createGraphRenderer({
    state, svg, viewport, zoom, panMode, select
});
const { renderList, renderDetails } = createPanels(state, select);
function updateTool() {
    $('canvas').dataset.tool = panMode() ? 'pan' : 'move';
    $('moveTool').setAttribute('aria-pressed', String(!panMode()));
    $('panTool').setAttribute('aria-pressed', String(panMode()));
}
function setTool(tool) {
    state.tool = tool;
    updateTool();
}
$('moveTool').onclick = () => setTool('move');
$('panTool').onclick = () => setTool('pan');
function updateViewToggle() {
    const isLive = $('mode').value === 'LIVE';
    $('liveView').setAttribute('aria-pressed', String(isLive));
}
function changeLayout() {
    if ($('mode').value !== 'LIVE')
        state.previousLayout = $('mode').value;
    updateViewToggle();
    arrange();
}
$('liveView').onclick = () => {
    const mode = $('mode');
    if (mode.value === 'LIVE') {
        mode.value = state.previousLayout;
    }
    else {
        state.previousLayout = mode.value;
        mode.value = 'LIVE';
    }
    changeLayout();
};
const editingTarget = e => e.target?.closest?.('input, textarea, select, button, [contenteditable=true]');
window.addEventListener('keydown', e => {
    if (editingTarget(e) || e.ctrlKey || e.metaKey || e.altKey)
        return;
    if (e.code === 'Space' && !e.target?.closest?.('.node')) {
        e.preventDefault();
        state.spaceHeld = true;
        updateTool();
    }
    else if (e.key.toLowerCase() === 'v') {
        setTool('move');
    }
    else if (e.key.toLowerCase() === 'h') {
        setTool('pan');
    }
});
window.addEventListener('keyup', e => {
    if (e.code === 'Space' && state.spaceHeld) {
        state.spaceHeld = false;
        updateTool();
    }
});
window.addEventListener('blur', () => {
    state.spaceHeld = false;
    updateTool();
});
async function load(config, filename) {
    const sinks = sinksOf(config);
    if (!sinks.length)
        throw Error('No vertex or edge mappings found under tables[].sinks.');
    const graph = buildGraph(config, sinks.includes('neptune') ? 'neptune' : sinks[0]);
    for (const sink of sinks)
        buildGraph(config, sink);
    state.config = config;
    state.filename = filename;
    $('appendLabel').hidden = false;
    $('yamlExport').disabled = false;
    const sel = $('sink');
    sel.replaceChildren();
    sinks.forEach(s => {
        const o = el('option', sel, s);
        o.value = s;
    });
    sel.value = graph.sink;
    sel.disabled = sinks.length === 1;
    await setGraph(graph);
}
async function setGraph(graph) {
    stopLive();
    clearGraph();
    state.layout = null;
    state.graph = graph;
    state.selected = null;
    $('schema').textContent = `${graph.schema} · ${state.filename} · ${graph.sink}`;
    $('metrics').querySelectorAll('strong').forEach((e, i) => e.textContent = [graph.tableCount, graph.nodes.length, graph.edges.length, graph.warnings.length][i]);
    notice([...sourceWarnings(state.config), ...(state.importNotes ?? []), ...graph.warnings].join(' · '));
    $('empty').hidden = graph.nodes.length > 0;
    for (const id of ['export', 'svgExport', 'relayout', 'fit'])
        $(id).disabled = !graph.nodes.length;
    renderList();
    renderDetails();
    await arrange();
}
async function arrange() {
    stopLive();
    const generation = ++state.generation;
    if (!state.graph?.nodes.length) {
        clearGraph();
        state.layout = null;
        return;
    }
    status('Calculating layout…');
    try {
        const layout = await layoutGraph(state.graph, {
            mode: $('mode').value, spacing: Number($('spacing').value)
        });
        if (generation !== state.generation)
            return;
        state.layout = layout;
        state.dragged.clear();
        render();
        startLive();
        fit();
        status('Layout ready');
    }
    catch (error) {
        if (generation === state.generation) {
            notice(`Layout failed: ${error.message}`);
            status('Layout error');
        }
    }
}
function select(selection) {
    state.selected = selection;
    renderList();
    renderDetails();
    highlight();
}
async function importFiles(ev, append) {
    const files = [...ev.target.files];
    if (!files.length)
        return;
    try {
        const existing = append && state.config ? {
            filename: state.filename, config: state.config
        } : null;
        const { config, notes } = await prepareImport(files, existing, append ? (state.importNotes ?? []) : []);
        state.importNotes = notes;
        await load(config, `${config.ontology_sources.length} source file(s)`);
    }
    catch (error) {
        notice(`Import failed: ${error.message}`);
        status('Import error');
    }
    finally {
        ev.target.value = '';
    }
}
$('file').onchange = ev => importFiles(ev, false);
$('appendFile').onchange = ev => importFiles(ev, true);
$('example').onclick = async () => {
    try {
        state.importNotes = [];
        await load(mergeMappings([{
                config: parse(sample), filename: 'example.yaml'
            }]), '1 source file');
    }
    catch (e) {
        notice(e.message);
    }
};
$('yamlExport').onclick = () => download('super-ontology.yaml', yaml.dump(state.config, {
    lineWidth: 120, noRefs: true
}), 'application/yaml');
$('sink').onchange = () => setGraph(buildGraph(state.config, $('sink').value));
$('mode').onchange = changeLayout;
$('spacing').oninput = () => {
    $('spacingValue').value = $('spacing').value;
};
$('spacing').onchange = arrange;
$('relayout').onclick = arrange;
$('fit').onclick = fit;
$('labels').onchange = highlight;
$('clear').onclick = () => select(null);
$('search').oninput = () => {
    renderList();
    highlight();
};
for (const [id, tab] of [['entitiesTab', 'nodes'], ['edgesTab', 'edges']])
    $(id).onclick = () => {
        state.tab = tab;
        $('entitiesTab').setAttribute('aria-pressed', String(tab === 'nodes'));
        $('edgesTab').setAttribute('aria-pressed', String(tab === 'edges'));
        renderList();
    };
$('plus').onclick = () => svg.transition().call(zoom.scaleBy, 1.25);
$('minus').onclick = () => svg.transition().call(zoom.scaleBy, .8);
$('export').onclick = () => download('ontology-graph.json', JSON.stringify(state.graph, null, 2), 'application/json');
$('svgExport').onclick = () => {
    if (state.layout?.nodes.length) exportSvg(svg, viewport);
};
