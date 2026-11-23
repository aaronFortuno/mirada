export function element(tag, options = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(options)) {
    if (value !== null && value !== undefined) node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

export function getPreference(key, fallback) {
  try { return localStorage.getItem('mirada:' + key) ?? fallback; }
  catch { return fallback; }
}

export function setPreference(key, value) {
  try { localStorage.setItem('mirada:' + key, value); }
  catch { /* Storage can be disabled. The current preference still applies. */ }
}
