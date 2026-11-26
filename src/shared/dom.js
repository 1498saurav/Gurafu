export const $ = id => document.getElementById(id);
export function el(tag, parent, text, cls) {
    const e = document.createElement(tag);
    if (text != null)
        e.textContent = String(text);
    if (cls)
        e.className = cls;
    parent.appendChild(e);
    return e;
}
export function notice(message = '') {
    $('notice').textContent = message;
    $('notice').hidden = !message;
}
export function status(message) {
    $('status').textContent = message;
}
export function download(name, text, type) {
    const u = URL.createObjectURL(new Blob([text], {
        type
    })), a = document.createElement('a');
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
}
