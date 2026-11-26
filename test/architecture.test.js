import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
function files(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? files(path) : [path];
    });
}
test('domain logic has no browser or feature dependencies', () => {
    for (const file of files(join(root, 'src/domain'))) {
        const source = readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /\b(?:document|window|localStorage)\s*\./);
        assert.doesNotMatch(source, /from\s+['"][^'"]*(?:features|app|shared)\//);
    }
});
test('all static relative imports resolve to packaged files', () => {
    for (const file of files(join(root, 'src')).filter((path) => path.endsWith('.js'))) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
            const target = resolve(dirname(file), match[1].split('?')[0]);
            assert.ok(existsSync(target), `${file}: missing ${match[1]}`);
        }
    }
});
