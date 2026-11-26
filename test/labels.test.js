import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeEdgeLabels } from '../src/features/graph/edge-labels.js';
test('places edge labels away from nodes and other labels', () => {
    const nodes = [{
            x: 0, y: 0, radius: 24, labelWidth: 60
        }];
    const edges = [{
            id: 'a'
        }, {
            id: 'b'
        }, {
            id: 'c'
        }];
    const routes = new Map([['a', {
                candidates: [{
                        x: 0, y: 0
                    }, {
                        x: 90, y: 0
                    }]
            }], ['b', {
                candidates: [{
                        x: 90, y: 0
                    }, {
                        x: 90, y: 35
                    }]
            }], ['c', {
                candidates: [{
                        x: 0, y: 0
                    }]
            }]]);
    const labels = placeEdgeLabels(nodes, edges, routes, () => 40);
    assert.deepEqual(labels.get('a'), {
        x: 90, y: 0, clear: true
    });
    assert.deepEqual(labels.get('b'), {
        x: 90, y: 35, clear: true
    });
    assert.equal(labels.get('c').clear, false);
});
test('selected edges receive placement priority', () => {
    const edges = [{
            id: 'a'
        }, {
            id: 'b'
        }];
    const routes = new Map(edges.map(e => [e.id, {
            label: {
                x: 0, y: 0
            }
        }]));
    const labels = placeEdgeLabels([], edges, routes, () => 50, new Set(['b']));
    assert.equal(labels.get('b').clear, true);
    assert.equal(labels.get('a').clear, false);
});
test('enterprise labels avoid the entire rectangular card', () => {
    const nodes = [{
            x: 0, y: 0, shape: 'rect', width: 220, height: 54
        }];
    const edges = [{
            id: 'a'
        }];
    const routes = new Map([['a', {
                candidates: [{
                        x: 90, y: 0
                    }, {
                        x: 160, y: 0
                    }]
            }]]);
    assert.deepEqual(placeEdgeLabels(nodes, edges, routes, () => 40).get('a'), {
        x: 160, y: 0, clear: true
    });
});
