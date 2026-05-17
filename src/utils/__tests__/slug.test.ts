import { describe, it, expect } from 'vitest'
import { slugify, inferLanguage, newId, fmtTimestamp } from '../slug'

describe('slugify', () => {
  it('lowercases and replaces whitespace with dashes', () => {
    expect(slugify('My Super Shader')).toBe('my-super-shader')
  })
  it('strips punctuation', () => {
    expect(slugify('hello.world!@#')).toBe('hello-world')
  })
  it('collapses multiple dashes', () => {
    expect(slugify('  spaced   out  ')).toBe('spaced-out')
  })
  it('falls back to untitled for empty input', () => {
    expect(slugify('!!!')).toBe('untitled')
    expect(slugify('')).toBe('untitled')
  })
})

describe('inferLanguage', () => {
  it.each([
    ['index.html', 'html'],
    ['main.js', 'javascript'],
    ['main.mjs', 'javascript'],
    ['scene.ts', 'typescript'],
    ['shader.frag', 'glsl'],
    ['shader.wgsl', 'wgsl'],
    ['style.css', 'css'],
    ['data.json', 'json'],
    ['icon.svg', 'svg'],
  ])('%s → %s', (name, lang) => {
    expect(inferLanguage(name)).toBe(lang)
  })
  it('defaults to javascript for unknown ext', () => {
    expect(inferLanguage('weird.xyz')).toBe('javascript')
  })
})

describe('newId', () => {
  it('returns a non-empty unique string', () => {
    const a = newId()
    const b = newId()
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a).not.toBe(b)
  })
})

describe('fmtTimestamp', () => {
  it('zero-pads hour/min/sec', () => {
    const ts = new Date(2026, 4, 17, 7, 5, 3).getTime()
    expect(fmtTimestamp(ts)).toBe('07:05:03')
  })
})
