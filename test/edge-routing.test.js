import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curve } from '../src/features/graph/edge-routing.js';

const nodes = new Map([
    ['a', { x: 0, y: 0, width: 100, height: 40 }],
    ['b', { x: 300, y: 0, width: 100, height: 40 }],
]);
const edge = { id: 'e', source: 'a', target: 'b' };

test('directed routes start and end at card boundaries', () => {
    const route = curve(edge, nodes, [edge]);
    assert.equal(route.d, 'M50,0 Q150,0 250,0');
    assert.deepEqual(route.label, { x: 150, y: 0 });
});
test('parallel and reciprocal relationships have separate paths', () => {
    const edges = [edge, { ...edge, id: 'f' }, { id: 'g', source: 'b', target: 'a' }];
    const paths = edges.map((item) => curve(item, nodes, edges).d);
    assert.equal(new Set(paths).size, 3);
});
test('self loops produce distinct finite routes', () => {
    const edges = [{ id: 'x', source: 'a', target: 'a' }, { id: 'y', source: 'a', target: 'a' }];
    const routes = edges.map((item) => curve(item, nodes, edges));
    assert.notEqual(routes[0].d, routes[1].d);
    assert.ok(routes.every((route) => !/NaN|Infinity/.test(route.d)));
});
