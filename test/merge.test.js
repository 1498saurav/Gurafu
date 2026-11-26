import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMappings, sourceWarnings } from '../src/domain/mapping-bundle.js';
import { buildGraph } from '../src/domain/graph-model.js';
const source = (filename, schema, tables) => ({
    filename, config: {
        target_schema: schema, tables
    }
});
const vertex = (name, label) => ({
    name, sinks: {
        neptune: {
            vertex: [{
                    label, id_column: ['id']
                }]
        }
    }
});
const edge = (name, from, to) => ({
    name, sinks: {
        neptune: {
            edges: [{
                    label: 'related', from: {
                        label: from
                    }, to: {
                        label: to
                    }
                }]
        }
    }
});
test('cross-file endpoints resolve and definitions retain provenance', () => {
    const merged = mergeMappings([source('a.yaml', 's', [vertex('a', 'X'), edge('links', 'X', 'Y')]), source('b.yaml', 's', [vertex('b', 'Y')])]);
    const g = buildGraph(merged);
    assert.equal(g.nodes.length, 2);
    assert.equal(g.warnings.length, 0);
    assert.equal(g.edges[0].sourceFile, 'a.yaml');
    assert.equal(g.nodes.find(n => n.id === 'Y').definitions[0].sourceFile, 'b.yaml');
    assert.equal(merged.target_schema, 's');
});
test('mixed schemas preserve metadata and warn rather than silently assigning one schema', () => {
    const c = mergeMappings([source('a.yaml', 's1', [vertex('a', 'X')]), source('b.yaml', 's2', [vertex('b', 'X')])]);
    assert.equal(c.target_schema, undefined);
    assert.equal(buildGraph(c).nodes[0].definitions.length, 2);
    assert.equal(buildGraph(c).schema, 'Multiple schemas');
    assert.match(sourceWarnings(c)[0], /Multiple source schemas/);
});
test('exported bundle reimports without losing provenance, and accepts append', () => {
    const initial = mergeMappings([source('a.yaml', 's', [vertex('a', 'X')]), source('b.yaml', 's', [vertex('b', 'Y')])]);
    assert.deepEqual(mergeMappings([{
            filename: 'super.yaml', config: JSON.parse(JSON.stringify(initial))
        }]), initial);
    const appended = mergeMappings([{
            filename: 'super.yaml', config: initial
        }, source('c.yaml', 's', [edge('c', 'X', 'Y')])]);
    assert.equal(appended.ontology_sources.length, 3);
    assert.equal(buildGraph(appended).edges[0].sourceFile, 'c.yaml');
});
test('duplicate mappings retained, invalid sources rejected', () => {
    const c = mergeMappings([source('a.yaml', 's', [vertex('a', 'X')]), source('a.yaml', 's', [vertex('a', 'X')])]);
    assert.equal(c.tables.length, 2);
    assert.match(sourceWarnings(c)[0], /Repeated table names/);
    assert.throws(() => mergeMappings([{
            filename: 'broken.yaml', config: {}
        }]), /broken.yaml/);
    assert.throws(() => mergeMappings([{
            filename: 'broken.yaml', config: {
                ...c, tables: [{
                        name: 'bad', ontology_source_id: 'unknown'
                    }]
            }
        }]), /unknown table source/);
});
