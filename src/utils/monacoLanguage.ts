import type { FileLanguage } from '@/types'

// Monaco has no first-party GLSL/WGSL language pack; fall back to plaintext for
// those until a community grammar gets wired in. svg maps to xml for tag coloring.
const LANG_MAP: Record<FileLanguage, string> = {
  html: 'html',
  javascript: 'javascript',
  typescript: 'typescript',
  glsl: 'plaintext',
  wgsl: 'plaintext',
  css: 'css',
  json: 'json',
  svg: 'xml',
}

export function monacoLanguageFor(language: FileLanguage): string {
  return LANG_MAP[language]
}
