import { defineConfig } from 'vite';

// Relative assets support GitHub Pages project sites and custom domains.
export default defineConfig({
    base: './',
    server: { host: '127.0.0.1' },
    build: { license: { fileName: 'third-party-licenses.md' }, sourcemap: false },
    plugins: [{
        name: 'gurafu-production-security',
        apply: 'build',
        transformIndexHtml() {
            return [{ tag: 'meta', attrs: {
                'http-equiv': 'Content-Security-Policy',
                content: "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; worker-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
            }, injectTo: 'head-prepend' }];
        },
    }],
});
