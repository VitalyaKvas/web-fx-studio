import type { FileItem, FileLanguage } from '@/types'

const MIME: Record<FileLanguage, string> = {
  html: 'text/html',
  javascript: 'text/javascript',
  typescript: 'text/javascript',
  glsl: 'text/plain',
  wgsl: 'text/plain',
  css: 'text/css',
  json: 'application/json',
  svg: 'image/svg+xml',
}

function mimeFor(language: FileLanguage): string {
  return MIME[language] ?? 'text/plain'
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Iframe-side runtime bridge. Captures fetch, console, and runtime errors and
// reports back to the host via window.parent.postMessage.
//
// Notes:
// - Same-origin postMessage is gated host-side via event.source check.
// - The fetch override matches both `./name` and bare `name` forms against the
//   virtual filesystem; misses fall through to the original fetch.
function buildBridgeScript(virtualFiles: Record<string, { content: string; mime: string }>): string {
  const json = JSON.stringify(virtualFiles)
  return `<script>(function(){
  try {
    var VFILES = ${json};
    var keys = Object.keys(VFILES);
    function findKey(url) {
      try {
        var u = String(url || '');
        if (VFILES[u]) return u;
        var stripped = u.replace(/^\\.\\//, '').replace(/^\\//, '');
        if (VFILES[stripped]) return stripped;
        var lastSeg = stripped.split('?')[0].split('#')[0].split('/').pop();
        if (lastSeg && VFILES[lastSeg]) return lastSeg;
        for (var i = 0; i < keys.length; i++) {
          if (u.indexOf(keys[i]) !== -1) return keys[i];
        }
      } catch (e) {}
      return null;
    }
    var origFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var key = findKey(url);
      if (key) {
        var rec = VFILES[key];
        return Promise.resolve(new Response(rec.content, {
          status: 200,
          headers: { 'Content-Type': rec.mime || 'text/plain' }
        }));
      }
      return origFetch(input, init);
    };

    function send(type, payload) {
      try {
        window.parent && window.parent.postMessage({ __webfx: true, type: type, payload: payload }, '*');
      } catch (e) {}
    }
    function fmt(args) {
      try {
        return Array.prototype.slice.call(args).map(function(a){
          if (a instanceof Error) return a.stack || a.message;
          if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
          return String(a);
        }).join(' ');
      } catch (e) { return String(args); }
    }
    var origLog = console.log, origWarn = console.warn, origErr = console.error, origInfo = console.info;
    console.log = function(){ send('CONSOLE_LOG', fmt(arguments)); return origLog.apply(console, arguments); };
    console.info = function(){ send('CONSOLE_INFO', fmt(arguments)); return origInfo.apply(console, arguments); };
    console.warn = function(){ send('CONSOLE_WARN', fmt(arguments)); return origWarn.apply(console, arguments); };
    console.error = function(){ send('CONSOLE_ERROR', fmt(arguments)); return origErr.apply(console, arguments); };
    window.addEventListener('error', function(ev){
      var msg = (ev.message || 'Error') + ' at ' + (ev.filename || '(inline)') + ':' + (ev.lineno||0) + ':' + (ev.colno||0);
      if (ev.error && ev.error.stack) msg += '\\n' + ev.error.stack;
      send('RUNTIME_ERROR', msg);
    });
    window.addEventListener('unhandledrejection', function(ev){
      var reason = ev.reason;
      var msg = (reason && reason.stack) ? reason.stack : String(reason);
      send('RUNTIME_ERROR', 'Unhandled rejection: ' + msg);
    });
    send('CONSOLE_INFO', 'iframe bridge ready');
  } catch (e) {
    try { window.parent.postMessage({ __webfx: true, type: 'RUNTIME_ERROR', payload: String(e && e.stack || e) }, '*'); } catch (_) {}
  }
})();</script>`
}

function inlineScriptsAndStyles(
  html: string,
  files: Record<string, FileItem>,
): string {
  let out = html

  // Inline <script src="./foo.js"> / <script src="foo.js"> references when foo.js
  // is in the virtual filesystem. Preserve the `type` attribute (especially
  // `type="module"`) so ESM imports continue to work via the import map below.
  out = out.replace(
    /<script\b([^>]*?)\bsrc=["'](?:\.\/)?([^"'/][^"']*)["']([^>]*)><\/script>/gi,
    (match: string, before: string, src: string, after: string) => {
      const file = files[src]
      if (!file) return match
      const attrs = (before + after).replace(/\s+/g, ' ').trim()
      const typeMatch = attrs.match(/type=["']([^"']+)["']/)
      const type = typeMatch ? ` type="${typeMatch[1]}"` : ''
      return `<script${type}>\n${file.content}\n</script>`
    },
  )

  // Inline <link rel="stylesheet" href="./foo.css"> references.
  out = out.replace(
    /<link\b([^>]*)>/gi,
    (match: string, attrs: string) => {
      if (!/rel=["']stylesheet["']/i.test(attrs)) return match
      const hrefMatch = attrs.match(/href=["'](?:\.\/)?([^"']+)["']/i)
      if (!hrefMatch) return match
      const href = hrefMatch[1] ?? ''
      const file = files[href]
      if (!file) return match
      return `<style>\n${file.content}\n</style>`
    },
  )

  return out
}

function buildImportMap(files: Record<string, FileItem>): string | null {
  const entries: Array<[string, string]> = []
  for (const [name, file] of Object.entries(files)) {
    if (!/\.(m?js|ts)$/i.test(name)) continue
    // Use a base64 data URL so dynamic `import('./name.js')` works inside the iframe.
    let b64: string
    try {
      b64 = btoa(unescape(encodeURIComponent(file.content)))
    } catch {
      b64 = ''
    }
    if (!b64) continue
    const dataUrl = `data:text/javascript;base64,${b64}`
    entries.push([`./${name}`, dataUrl])
    entries.push([name, dataUrl])
  }
  if (entries.length === 0) return null
  const map = { imports: Object.fromEntries(entries) }
  // Use a distinct id so it doesn't conflict with author-provided importmaps.
  return `<script type="importmap" data-webfx-virtual>${JSON.stringify(map)}</script>`
}

/**
 * Builds the `srcdoc` HTML for the preview iframe. Inlines scripts/styles from
 * the virtual filesystem, injects an import map for dynamic ES imports, and
 * installs the runtime bridge (fetch override + console + error reporting).
 */
export function buildIframeSrcdoc(files: Record<string, FileItem>): string {
  const indexFile = files['index.html']
  if (!indexFile) {
    return errorSrcdoc('No index.html found in this preset.')
  }

  let html = inlineScriptsAndStyles(indexFile.content, files)

  // Build the virtual files dictionary for the runtime bridge — every non-html
  // file is exposed via fetch override.
  const virtualFiles: Record<string, { content: string; mime: string }> = {}
  for (const [name, file] of Object.entries(files)) {
    if (name === 'index.html') continue
    virtualFiles[name] = { content: file.content, mime: mimeFor(file.language) }
  }

  const importMap = buildImportMap(files)
  const bridge = buildBridgeScript(virtualFiles)
  const injection = (importMap ? importMap + '\n' : '') + bridge

  // Inject right after <head> opening (or before </head> if we can find it)
  // so the bridge wraps everything that follows.
  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/(<head\b[^>]*>)/i, `$1\n${injection}`)
  } else if (/<body\b[^>]*>/i.test(html)) {
    html = html.replace(/(<body\b[^>]*>)/i, `$1\n${injection}`)
  } else {
    html = injection + html
  }

  return html
}

// Surface a small helper for callers that want to spell out file errors.
export function errorSrcdoc(message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Error</title><style>
body{background:#140808;color:#ff8b95;font-family:ui-monospace,monospace;padding:24px;margin:0;line-height:1.6}
</style></head><body><pre>${htmlEscape(message)}</pre></body></html>`
}
