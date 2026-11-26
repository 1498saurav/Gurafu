import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, sinksOf, neighborhood } from '../src/domain/graph-model.js';
const edge = (label, from, to) => ({
    label, from: {
        label: from, id_column: ['key_a', 'key_b']
    }, to: {
        label: to, id_column: ['id']
    }, properties: ['amount:total']
});
const config = {
    target_schema: 'test', tables: [{
            name: 'a', sinks: {
                neptune: {
                    vertex: [{
                            label: 'X', id_column: ['key_a', 'key_b'], properties: ['col:alias']
                        }], edges: [edge('rel', 'X', 'Y'), edge('rel2', 'X', 'Y'), edge('loop', 'X', 'X')]
                }
            }
        }, {
            name: 'b', sinks: {
                neptune: {
                    vertex: [{
                            label: 'X', id_column: ['key_a', 'key_b']
                        }], edges: [edge('third', 'Y', 'Z')]
                }
            }
        }]
};
test('deduplicate entity labels; retain multiple definitions, parallel edges and self loops', () => {
    const g = buildGraph(config);
    assert.equal(g.nodes.length, 3);
    assert.equal(g.edges.length, 4);
    assert.equal(g.nodes.find(n => n.id === 'X').definitions.length, 2);
    assert.equal(g.nodes.find(n => n.id === 'X').references.length, 3);
    assert.equal(g.warnings.length, 2);
    assert.deepEqual(g.edges[0].sourceKeys, ['key_a', 'key_b']);
    assert.deepEqual(g.edges[0].properties, ['amount:total']);
});
test('neighborhood and missing endpoints', () => {
    const h = neighborhood(buildGraph(config), 'Y');
    assert.deepEqual([...h.nodes].sort(), ['X', 'Y', 'Z']);
    assert.equal(h.edges.length, 3);
});
test('sink discovery is data driven', () => {
    assert.deepEqual(sinksOf({
        tables: [{
                sinks: {
                    other: {
                        vertex: []
                    }, andi: {}, neptune: {
                        edges: []
                    }
                }
            }]
    }), ['neptune', 'other']);
});
test('invalid config or malformed endpoints', () => {
    assert.throws(() => buildGraph({}), /tables/);
    assert.throws(() => buildGraph({
        tables: [{
                name: 'x', sinks: {
                    neptune: {
                        edges: [{
                                label: 'x'
                            }]
                    }
                }
            }]
    }), /from.label/);
});
