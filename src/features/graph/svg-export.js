import { download } from '../../shared/dom.js';
export function exportSvg(svg, viewport) {
    const original = svg.node(), clone = original.cloneNode(true), bounds = viewport.node().getBBox();
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', `${bounds.x - 24} ${bounds.y - 24} ${bounds.width + 48} ${bounds.height + 48}`);
    clone.setAttribute('width', bounds.width + 48);
    clone.setAttribute('height', bounds.height + 48);
    clone.querySelector(':scope > g').removeAttribute('transform');
    clone.querySelectorAll('.edge-hit').forEach(n => n.remove());
    clone.querySelectorAll('.dim,.selected,.active').forEach(n => n.classList.remove('dim', 'selected', 'active'));
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = '.node-box{fill:white;stroke:#aebccd;stroke-width:1.25}.network-node{fill:#f1f5fa;stroke:#7389a2}.enterprise-node .node-box{fill:#fff;stroke:#aebccd;stroke-width:1.5}.node-name{fill:#152b45;font:600 13px system-ui}.network-name{paint-order:stroke;stroke:white;stroke-width:4px}.node-meta{fill:#6b7b8d;font:11px system-ui}.edge{fill:none;stroke:#8799ad;stroke-width:1.35}.edge-label{fill:#52647a;font:11px system-ui;paint-order:stroke;stroke:white;stroke-width:4px}.undefined .node-box{stroke-dasharray:5 3}';
    clone.prepend(style);
    download('ontology.svg', new XMLSerializer().serializeToString(clone), 'image/svg+xml');
}
