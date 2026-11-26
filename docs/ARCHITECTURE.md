# Architecture

The application is a browser-local, modular frontend. It deliberately uses the existing vanilla JavaScript, D3, ELK and Vite stack; no backend, React migration or database is required.

## Dependency direction

`main → app → features → domain/shared`. Domain modules do not import UI, browser APIs or layout libraries. `main.js` is the entry point; `app/workspace.js` coordinates state and feature calls. The graph renderer owns SVG state and simulation lifetime, while the workspace owns imported configuration and current selection.

- Domain: graph normalization, validation, source resolution and provenance; pure functions.
- Import: parse and validate complete batches before replacing the workspace; errors retain filenames.
- Graph: layout strategy, edge geometry, labels, rendering and SVG export. Live force and stable layouts remain separate options.
- Inspector: explorer and detail rendering. Display imported strings as text, never executable HTML.
- Shared: DOM and file download utilities. Styles use neutral tokens and reusable selectors.

## Engineering constraints

Preserve original labels, composite keys, source metadata and parallel edges. Entity identity remains exact label within a sink; collisions across schemas produce warnings. The Super YAML format is a visualization bundle, not an ingestion manifest. No company YAML or credentials belong in the repository. No SQL execution or remote graph ingestion occurs.

Future work before production: browser interaction regression tests, dependency lockfile and security scanning, scale/performance benchmarks, resource limits for untrusted YAML, accessibility audit, threat model and deployment policy. Add authentication only if required by the hosting environment; this app does not currently implement access control.
