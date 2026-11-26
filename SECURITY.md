# Security policy

Gurafu is a browser-local schema viewer. It never executes imported SQL. Treat uploaded mappings and generated YAML, JSON and SVG exports as confidential if they contain confidential metadata. Do not use a public deployment for employer data without authorization.

Report vulnerabilities privately via GitHub's Security tab (private vulnerability reporting should be enabled by the maintainer). Do not include secrets, proprietary mappings or exploit payloads in public issues.

Controls: safe YAML core schema, disabled aliases, bounded depth, file size and graph size limits, rejection of prototype-related keys, text-only DOM insertion, production CSP, pinned direct npm versions, lockfile-based CI, scheduled npm advisory audits and Dependabot. GitHub Pages serves public static content; the production CSP is a meta policy, not a full set of security response headers.

Before publishing: generate and commit a lockfile; run full audit, formatting, lint, tests and build; enable private reporting, secret scanning, push protection and CodeQL in repository settings. Audit findings are not proof of exploitation and passing audits is not a guarantee of security. Workflow tags still need immutable SHA pinning for stronger supply-chain assurance. Review all dependency licenses and attribution, particularly ELK's EPL-2.0 distribution obligations; Gurafu's proposed Apache-2.0 license does not relicense its dependencies.
