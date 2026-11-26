import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, validateMappingData } from '../src/domain/import-limits.js';
import { buildGraph } from '../src/domain/graph-model.js';

test('accepts ordinary mapping data', () => {
    const data = { tables: [{ name: 'example', sql: 'SELECT 1' }] };
    assert.equal(validateMappingData(data), data);
});
test('rejects prototype keys and nonplain objects', () => {
    assert.throws(() => validateMappingData(JSON.parse('{"__proto__":{"x":1}}')), /Unsafe/);
    assert.throws(() => validateMappingData({ value: new Date() }), /plain/);
});
test('rejects cyclic and aliased objects', () => {
    const cycle = {}; cycle.self = cycle;
    assert.throws(() => validateMappingData(cycle), /reference/);
    const shared = {};
    assert.throws(() => validateMappingData([shared, shared]), /reference/);
});
test('rejects excessive nesting and graph size', () => {
    let nested = {};
    for (let i = 0; i <= LIMITS.depth; i++) nested = { nested };
    assert.throws(() => validateMappingData(nested), /structural/);
    const vertex = Array.from({ length: LIMITS.nodes + 1 }, (_, i) => ({ label: `n${i}` }));
    assert.throws(() => buildGraph({ tables: [{ name: 'demo', sinks: { neptune: { vertex } } }] }), /entity limit/);
});
