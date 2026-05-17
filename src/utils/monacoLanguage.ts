import type { FileLanguage } from '@/types'

// WGSL ships with monaco-editor and is auto-registered by its contribution
// module. GLSL is registered in `monacoSetup.ts` (Monarch grammar — Monaco has
// no first-party GLSL pack). svg maps to xml for tag coloring.
const LANG_MAP: Record<FileLanguage, string> = {
  html: 'html',
  javascript: 'javascript',
  typescript: 'typescript',
  glsl: 'glsl',
  wgsl: 'wgsl',
  css: 'css',
  json: 'json',
  svg: 'xml',
}

export function monacoLanguageFor(language: FileLanguage): string {
  return LANG_MAP[language]
}
