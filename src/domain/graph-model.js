import { LIMITS } from './import-limits.js';
// Pure mapping adapter. No domain-specific entity names or positions.
const array = (v, path) => {
    if (v == null)
        return [];
    if (!Array.isArray(v))
        throw new Error(`${path} must be an array`);
    return v;
};
const required = (v, path) => {
    if (typeof v !== 'string' || !v.trim())
        throw new Error(`${path} must be a nonempty string`);
    if (v.trim().length > LIMITS.labelLength) throw new Error(`${path} exceeds the label length limit`);
    return v.trim();
};
export function buildGraph(config, sink = 'neptune') {
    if (!config || !Array.isArray(config.tables))
        throw new Error('Expected a top-level tables array.');
    const nodes = new Map(), edges = [], warnings = [], tables = config.tables;
    const get = id => {
        if (!nodes.has(id)) {
            if (nodes.size >= LIMITS.nodes) throw new Error('Graph exceeds the entity limit.');
            nodes.set(id, {
                id, definitions: [], references: []
            });
        }
        return nodes.get(id);
    };
    tables.forEach((table, i) => {
        const path = `tables[${i}]`, name = required(table?.name, `${path}.name`), mapping = table.sinks?.[sink];
        if (mapping == null)
            return;
        if (typeof mapping !== 'object' || Array.isArray(mapping))
            throw new Error(`${path}.sinks.${sink} must be an object`);
        const provenance = config.ontology_sources?.find(s => s.id === table.ontology_source_id);
        const context = {
            ...(provenance ? {
                sourceId: provenance.id, sourceFile: provenance.filename, sourceSchema: provenance.metadata.target_schema ?? null
            } : {}), table: name, tableIndex: i, sql: table.sql ?? '', primaryKeys: array(table.primary_keys, `${path}.primary_keys`), refreshSource: table.refresh_source
        };
        array(mapping.vertex, `${path}.vertex`).forEach((v, j) => {
            const label = required(v?.label, `${path}.vertex[${j}].label`);
            get(label).definitions.push({
                ...context, idColumns: array(v.id_column, `${path}.vertex[${j}].id_column`), properties: array(v.properties, `${path}.vertex[${j}].properties`)
            });
        });
        array(mapping.edges, `${path}.edges`).forEach((e, j) => {
            const ep = `${path}.edges[${j}]`, source = required(e?.from?.label, `${ep}.from.label`), target = required(e?.to?.label, `${ep}.to.label`);
            const edge = {
                id: `edge:${i}:${j}`, label: required(e.label, `${ep}.label`), source, target, sourceKeys: array(e.from.id_column, `${ep}.from.id_column`), targetKeys: array(e.to.id_column, `${ep}.to.id_column`), properties: array(e.properties, `${ep}.properties`), ...context
            };
            if (edges.length >= LIMITS.edges) throw new Error('Graph exceeds the relationship limit.');
            edges.push(edge);
            get(source).references.push(edge.id);
            if (source !== target)
                get(target).references.push(edge.id);
        });
    });
    for (const n of nodes.values())
        if (!n.definitions.length)
            warnings.push(`Referenced entity has no vertex definition: ${n.id}`);
    return {
        schema: config.target_schema ?? (new Set((config.ontology_sources ?? []).map(s => s.metadata.target_schema ?? null)).size > 1 ? 'Multiple schemas' : 'Untitled schema'), sink, tableCount: tables.length, nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)), edges, warnings
    };
}
export function sinksOf(config) {
    return [...new Set((config?.tables ?? []).flatMap(t => Object.entries(t?.sinks ?? {}).filter(([, v]) => v && (Array.isArray(v.vertex) || Array.isArray(v.edges))).map(([k]) => k)))].sort();
}
export function neighborhood(graph, id) {
    const edges = graph.edges.filter(e => e.source === id || e.target === id);
    return {
        edges, nodes: new Set([id, ...edges.flatMap(e => [e.source, e.target])])
    };
}
