# Gurafu

A browser-only, data-driven schema visualizer for Neptune-style YAML mapping definitions. The application opens empty. No company configuration, labels, SQL, coordinates, or icon mapping is embedded. `example.yaml` is optional synthetic data.

## Run

Requires Node.js 24 LTS and npm. From this directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Select **Import YAML** and choose your mapping file. For a static production deployment:

```sh
npm run build
npm run preview
```

Host the generated `dist/` directory on an approved static web server. All YAML parsing and graph layout run locally in the browser; SQL is displayed, never executed. Dependencies are installed at build time, not loaded from public CDNs at runtime.

## Supported mapping contract

The adapter reads `target_schema`, `tables[]`, and `tables[].sinks.<sink>.vertex[]` / `edges[]`. It discovers graph-capable sink names dynamically (preferring `neptune` if present). A vertex has `label`, `id_column`, `properties`; an edge has `label`, `from.label`, `to.label`, endpoint ID columns, and optional properties. Table name, primary keys, SQL and refresh_source are retained as metadata. Labels define entity identity across mappings; multiple mappings, parallel directed relationships, self-loops and composite IDs are retained. Referenced-only endpoints are displayed with a dashed border and reported as warnings, not silently discarded. No source SQL parsing or data execution is performed. The legacy indentation fallback is reported when applied. See `example.yaml` for the shape.

## Enterprise source structure (v2.0)

- `src/main.js`: entry point.
- `src/app/workspace.js`: application state, layout orchestration and event wiring.
- `src/domain/`: graph model and Super YAML merge rules.
- `src/features/import/`: YAML parsing and batch validation.
- `src/features/graph/`: layout, rendering, edge routing, label placement and export.
- `src/features/inspector/`: explorer and inspector UI.
- `src/shared/`: DOM and download utilities.
- `src/styles/`: design styling.
- `test/`: unit and architecture tests.

See [architecture](docs/ARCHITECTURE.md) and [coding standards](CONTRIBUTING.md). This release reorganizes the entire source tree; use the full ZIP rather than merging individual files from v1.5. Run `npm install`, `npm run format`, then `npm run check`. Commit the generated lockfile. The lint/build/format tools require dependency installation.

## Working with the graph

Enterprise Network is the default: rounded rectangular cards and directed edges. Classic Live Force provides reactive node movement. Switch to left-to-right or top-to-bottom to use the original flowchart layouts. Adjust the spacing slider (40–220); releasing it recalculates layout. Smart labels try several positions along a network edge and suppress labels that would collide; selecting an entity or relationship prioritizes connected labels. All, On selection and Hidden label modes are also available. Click Auto layout to reset manual positions. Use **Move nodes** (V) to drag individual entities, or drag empty canvas space to pan. Use **Pan canvas** (H) to drag the entire view even when starting on a node or relationship. Hold Space temporarily to pan, then release to resume moving nodes (when not editing or activating a focused control). Scroll to zoom, or use the zoom buttons. Dragging preserves manual positions until a new automatic layout is requested (spacing or layout changes also recalculate positions); Fit view does not change positions. Incident edges reroute as curves while untouched edges retain ELK orthogonal routes. Select a node to highlight its neighborhood and inspect every source mapping. Search by name or edge label. Use label controls to reduce clutter. SVG export captures the current view's diagram geometry; JSON exports the normalized schema, not coordinates. Changes to positions are session-only; the YAML itself is never modified.

## Scope and validation

This is a source-code starter, not a deployed production service. It is a schema/mapping explorer, not a database or instance-level graph viewer. It does not edit YAML, persist layout positions, validate SQL or authenticate users. ELK reduces overlap and crossing; the network layout uses collision forces and best-effort label placement, but arbitrary dense graphs can still have edge crossings. Wider spacing can require zooming in after Fit view. The browser app and production build require dependency installation; npm registry access was unavailable in the authoring environment. The pure adapter tests and JS syntax checks can run without external dependencies.

## Multiple YAML files and Super YAML (v1.3)

- **Import YAMLs** selects one or many files in one operation and replaces the current workspace. **Add YAMLs** appends additional files. Files are parsed independently, then validated as a combined graph; malformed files fail the import instead of silently dropping mappings. The layout is recalculated on import/append.
- Entity identity is the exact vertex/endpoint label (case-sensitive), within the currently selected sink. Matching labels are unified across source files, including across schemas; distinct definitions and relationships remain intact, including repeated table mappings and parallel edges. Mixed schemas and duplicate table names produce warnings. If equal labels represent different concepts, rename them before combining. Different sinks remain separate selectable views.
- The inspector shows each mapping's original filename and target schema. `Export Super YAML` exports a single visualization bundle containing the original table mappings, source IDs, and each original file's top-level metadata. A shared `target_schema` is retained only when all sources agree. Reimport the exported bundle or add more mappings to it. This format is intended for visualization, not direct submission to an ingestion pipeline; comments and formatting are not preserved. Original files are never changed.
- Ten pure unit tests cover model, labels, and merging, including provenance and bundle round-trip at the object level. The browser and production build still require local dependency installation/testing.

### Enterprise view (v1.4)
Use the third control beside Move nodes and Pan canvas to toggle a rounded-card force-directed layout showing each entity and its first mapping table. The Layout selector also includes Enterprise. Press again to restore the previous layout. Interaction modes are independent, so dragging and panning remain available. Switching layouts recalculates node positions; Fit view does not. The view uses the current merged model and the existing spacing and label controls.


## v1.5 — Four card-based layouts

Enterprise Network (default), Classic Live Force, Flowchart Left to Right and Flowchart Top to Bottom. The old circular-node view has been removed. In Classic Live Force, drag a card to pin it while other cards react to springs and collision forces. Use Auto layout to release pins and recompute. The spacing slider works in both network modes. Move nodes and Pan canvas remain independent; the Live force view button toggles the classic mode. All modes use the currently imported mapping(s).

## Publish on GitHub Pages

Create an empty public repository named `gurafu`. Before committing, run `npm install`, `npm run format`, `npm run audit`, and `npm run check`. Commit `package-lock.json`; CI intentionally requires it. Run `npm run deps:latest` only as a deliberate upgrade, then repeat the checks and review changes. Push the project to `main`. In Settings → Pages, choose **GitHub Actions** as the source. The included Pages workflow publishes only `dist/` after checks succeed. Your site will normally be `https://YOUR_USERNAME.github.io/gurafu/`.

See [Security policy](SECURITY.md). The initial review is not a completed security audit: the npm registry was inaccessible during preparation, so the resolved tree, browser tests, build and lint checks remain pending. The sample is synthetic; do not commit production mapping files. The intended license is Apache-2.0, subject to confirmation that you own the code and can publish it. Review bundled third-party license notices and provide corresponding upstream ELK source access as required by EPL-2.0. ELK source: https://github.com/kieler/elkjs/tree/0.12.2.
