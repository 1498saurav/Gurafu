import { $, el } from '../../shared/dom.js';
import { neighborhood } from '../../domain/graph-model.js';
export function createPanels(state, select) {
    function renderList() {
        const p = $('items');
        p.replaceChildren();
        if (!state.graph) {
            el('p', p, 'No mapping loaded.', 'muted');
            return;
        }
        const term = $('search').value.trim().toLowerCase(), isNode = state.tab === 'nodes';
        const list = (isNode ? state.graph.nodes : state.graph.edges).filter(x => (isNode ? x.id : [x.label, x.source, x.target].join(' ')).toLowerCase().includes(term));
        $('count').textContent = `${list.length} results`;
        for (const x of list) {
            const b = el('button', p, isNode ? x.id : x.label, 'item'), kind = isNode ? 'node' : 'edge';
            b.setAttribute('aria-current', String(state.selected?.kind === kind && state.selected.id === x.id));
            el('small', b, isNode ? `${x.references.length} relationships · ${x.definitions.length} mappings` : `${x.source} → ${x.target}`);
            b.onclick = () => select({
                kind, id: x.id
            });
        }
        if (!list.length)
            el('p', p, 'No matches.', 'muted');
    }
    function block(p, title) {
        const s = el('div', p, null, 'section');
        el('h3', s, title);
        return s;
    }
    function chips(p, title, values) {
        const s = block(p, title);
        if (!values.length)
            el('p', s, 'None', 'muted');
        else
            values.forEach(v => el('span', s, typeof v === 'object' ? JSON.stringify(v) : v, 'chip'));
    }
    function sql(p, value) {
        const s = block(p, 'Source SQL');
        el('pre', s, value || 'Not supplied');
    }
    function mappingDetails(p, m) {
        el('div', p, m.table, 'mapping');
        if (m.sourceFile) {
            el('p', p, `Source: ${m.sourceFile} · ${m.sourceSchema ?? 'Unspecified schema'}`, 'muted');
        }
        chips(p, 'Primary keys', m.primaryKeys);
        if (m.refreshSource !== undefined)
            el('p', block(p, 'Refresh source'), String(m.refreshSource));
    }
    function renderDetails() {
        const p = $('details');
        p.replaceChildren();
        const s = state.selected;
        $('clear').hidden = !s;
        if (!s) {
            el('p', p, 'Select an entity or relationship to view its mapping.', 'muted');
            return;
        }
        if (s.kind === 'node') {
            const n = state.graph.nodes.find(n => n.id === s.id);
            el('div', p, n.id, 'details-title');
            el('p', p, n.definitions.length ? 'Entity type' : 'Referenced only — no vertex definition', 'muted');
            for (const m of n.definitions) {
                mappingDetails(p, m);
                chips(p, 'Vertex ID columns', m.idColumns);
                chips(p, 'Properties', m.properties);
                sql(p, m.sql);
            }
            const section = block(p, 'Connected relationships');
            for (const e of neighborhood(state.graph, n.id).edges) {
                const b = el('button', section, e.label, 'item');
                el('small', b, `${e.source} → ${e.target}`);
                b.onclick = () => select({
                    kind: 'edge', id: e.id
                });
            }
        }
        else {
            const e = state.graph.edges.find(e => e.id === s.id);
            el('div', p, e.label, 'details-title');
            el('p', p, `${e.source} → ${e.target}`, 'muted');
            mappingDetails(p, e);
            chips(p, 'Source ID columns', e.sourceKeys);
            chips(p, 'Target ID columns', e.targetKeys);
            chips(p, 'Relationship properties', e.properties);
            sql(p, e.sql);
        }
    }
    return {
        renderList, renderDetails
    };
}
