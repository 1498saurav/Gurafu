// A visualization bundle, not a pipeline deployment manifest.
export const BUNDLE_FORMAT = 'ontology-super-yaml/v1';
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function readSource(config, filename) {
    if (!plain(config) || !Array.isArray(config.tables))
        throw new Error(`${filename}: expected a top-level tables array.`);
    if (config.ontology_bundle === BUNDLE_FORMAT) {
        if (!Array.isArray(config.ontology_sources))
            throw new Error(`${filename}: missing ontology_sources.`);
        const ids = new Map();
        const sources = config.ontology_sources.map(s => {
            if (!plain(s) || typeof s.id !== 'string' || !s.id || ids.has(s.id) || typeof s.filename !== 'string' || !plain(s.metadata))
                throw new Error(`${filename}: invalid or duplicate bundle source.`);
            const out = {
                filename: s.filename, metadata: s.metadata, tables: []
            };
            ids.set(s.id, out);
            return out;
        });
        for (const table of config.tables) {
            if (!plain(table))
                throw new Error(`${filename}: invalid table mapping.`);
            const { ontology_source_id, ...mapping } = table;
            const source = ids.get(ontology_source_id);
            if (!source)
                throw new Error(`${filename}: unknown table source ${ontology_source_id}.`);
            source.tables.push(mapping);
        }
        return sources;
    }
    const { tables, ...metadata } = config;
    for (const table of tables) {
        if (!plain(table))
            throw new Error(`${filename}: invalid table mapping.`);
        if (Object.hasOwn(table, 'ontology_source_id'))
            throw new Error(`${filename}: ontology_source_id is reserved for visualization bundles.`);
    }
    return [{
            filename, metadata, tables
        }];
}
export function mergeMappings(documents) {
    if (!Array.isArray(documents) || !documents.length)
        throw new Error('Choose at least one YAML file.');
    const sources = documents.flatMap(({ config, filename }) => readSource(config, filename));
    if (!sources.length)
        throw new Error('No sources found in the bundle.');
    const schemas = [...new Set(sources.map(s => s.metadata.target_schema ?? null))];
    const ontology_sources = [], tables = [];
    sources.forEach((s, i) => {
        const id = `source-${i + 1}`;
        ontology_sources.push({
            id, filename: s.filename, metadata: s.metadata
        });
        for (const table of s.tables)
            tables.push({
                ...table, ontology_source_id: id
            });
    });
    return {
        ontology_bundle: BUNDLE_FORMAT, ...(schemas.length === 1 && schemas[0] != null ? {
            target_schema: schemas[0]
        } : {}), ontology_sources, tables
    };
}
export function sourceWarnings(config) {
    const sources = config.ontology_sources ?? [], warnings = [];
    const schemas = new Set(sources.map(s => s.metadata.target_schema ?? null));
    if (schemas.size > 1)
        warnings.push('Multiple source schemas: matching entity labels are combined across schemas.');
    const seen = new Set(), duplicate = new Set();
    for (const table of config.tables) {
        const source = sources.find(s => s.id === table.ontology_source_id);
        const schema = source?.metadata?.target_schema ?? null;
        const key = JSON.stringify([schema, table.name]);
        if (seen.has(key))
            duplicate.add(table.name);
        seen.add(key);
    }
    if (duplicate.size)
        warnings.push(`Repeated table names retained as separate mappings: ${[...duplicate].join(', ')}.`);
    return warnings;
}
