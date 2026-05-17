import { describe, it, expect } from 'vitest'
import { buildIframeSrcdoc, errorSrcdoc } from '../bundler'
import type { FileItem } from '@/types'

function file(name: string, content: string, language: FileItem['language'] = 'javascript'): FileItem {
  return { name, content, language, isDirty: false }
}

describe('buildIframeSrcdoc', () => {
  it('returns an error page when index.html is missing', () => {
    const out = buildIframeSrcdoc({})
    expect(out).toContain('No index.html')
  })

  it('inlines script tags that reference virtual files', () => {
    const files = {
      'index.html': file(
        'index.html',
        '<!doctype html><html><head><title>x</title></head><body><script type="module" src="./main.js"></script></body></html>',
        'html',
      ),
      'main.js': file('main.js', 'console.log("hello");'),
    }
    const out = buildIframeSrcdoc(files)
    expect(out).not.toMatch(/src=["']\.\/main\.js["']/)
    expect(out).toContain('console.log("hello");')
    expect(out).toMatch(/<script type="module">/)
  })

  it('inlines stylesheet links that reference virtual files', () => {
    const files = {
      'index.html': file(
        'index.html',
        '<!doctype html><html><head><link rel="stylesheet" href="./style.css" /></head><body></body></html>',
        'html',
      ),
      'style.css': file('style.css', 'body { color: red }', 'css'),
    }
    const out = buildIframeSrcdoc(files)
    expect(out).not.toMatch(/href=["']\.\/style\.css["']/)
    expect(out).toContain('body { color: red }')
    expect(out).toMatch(/<style>/)
  })

  it('injects the runtime bridge into <head>', () => {
    const files = {
      'index.html': file(
        'index.html',
        '<!doctype html><html><head><title>x</title></head><body></body></html>',
        'html',
      ),
    }
    const out = buildIframeSrcdoc(files)
    expect(out).toContain('__webfx')
    expect(out).toContain('window.fetch')
    expect(out).toContain('postMessage')
  })

  it('emits an importmap entry for every virtual js file', () => {
    const files = {
      'index.html': file('index.html', '<!doctype html><html><head></head><body></body></html>', 'html'),
      'main.js': file('main.js', 'export const x = 1;'),
      'lib.js': file('lib.js', 'export const y = 2;'),
    }
    const out = buildIframeSrcdoc(files)
    expect(out).toMatch(/<script type="importmap" data-webfx-virtual>/)
    expect(out).toContain('"./main.js"')
    expect(out).toContain('"./lib.js"')
  })

  it('embeds each non-html file in the runtime VFILES dictionary', () => {
    const files = {
      'index.html': file('index.html', '<!doctype html><html><head></head><body></body></html>', 'html'),
      'shader.frag': file('shader.frag', 'void main(){}', 'glsl'),
    }
    const out = buildIframeSrcdoc(files)
    expect(out).toContain('shader.frag')
    expect(out).toContain('void main(){}')
  })
})

describe('errorSrcdoc', () => {
  it('html-escapes the message', () => {
    const out = errorSrcdoc('<script>alert(1)</script>')
    expect(out).not.toContain('<script>alert(1)</script>')
    expect(out).toContain('&lt;script&gt;')
  })
})
