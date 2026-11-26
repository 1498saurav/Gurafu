import * as yaml from 'js-yaml';
import { LIMITS, validateMappingData } from '../../domain/import-limits.js';
import { mergeMappings } from '../../domain/mapping-bundle.js';
import { buildGraph, sinksOf } from '../../domain/graph-model.js';
export function parse(text) {
    if (new TextEncoder().encode(text).length > LIMITS.fileBytes) throw new Error('YAML exceeds the 5 MiB file limit.');
    return validateMappingData(yaml.load(text.replace(/^[\uFEFF\u200B]+/, ''), { schema: yaml.CORE_SCHEMA, maxDepth: LIMITS.depth, maxAliases: 0, maxTotalMergeKeys: 1000 }));
}
function parseFile(text, filename, notes) {
    try {
        return parse(text);
    }
    catch (original) {
        const fixed = text.replace(/^- name:/gm, ' - name:');
        if (fixed === text)
            throw original;
        const config = parse(fixed);
        notes.push(`${filename}: legacy table indentation normalized.`);
        return config;
    }
}
// Read and validate a complete batch before committing it to the workspace.
export async function prepareImport(files, existing, previousNotes = []) {
    if (files.length > LIMITS.files || files.some(f => f.size > LIMITS.fileBytes) || files.reduce((sum, f) => sum + f.size, 0) > LIMITS.batchBytes) throw new Error('Import exceeds the file or batch size limit.');
    const notes = [...previousNotes];
    const docs = await Promise.all(files.map(async (file) => {
        try {
            return {
                filename: file.name, config: parseFile(await file.text(), file.name, notes)
            };
        }
        catch (error) {
            throw new Error(`${file.name}: ${error.message}`, {
                cause: error
            });
        }
    }));
    if (existing)
        docs.unshift(existing);
    const config = mergeMappings(docs);
    if (config.tables.length > LIMITS.tables || config.ontology_sources.length > LIMITS.files || new TextEncoder().encode(JSON.stringify(config)).length > LIMITS.batchBytes) throw new Error('Combined mapping exceeds workspace limits.');
    const sinks = sinksOf(config);
    if (!sinks.length)
        throw new Error('No graph-capable mappings found.');
    for (const sink of sinks)
        buildGraph(config, sink);
    return {
        config, notes
    };
}
