// Canonical data model for WebFX Studio.
// Mirrors docs/full-specification.md §3. The 'pixi' member of PresetType was
// added as a documented contract change (see §3 changelog there).

export type FileLanguage =
  | 'html'
  | 'javascript'
  | 'typescript'
  | 'glsl'
  | 'wgsl'
  | 'css'
  | 'json'
  | 'svg'

export interface FileItem {
  name: string
  content: string
  language: FileLanguage
  isDirty: boolean
}

export type PresetType = 'webgl' | 'webgpu' | 'houdini' | 'svg' | 'threejs' | 'pixi'

export interface Preset {
  id: string
  name: string
  type: PresetType
  isCustom: boolean
  files: Record<string, FileItem>
  activeFileName: string
}

export type LogLevel = 'log' | 'warn' | 'error' | 'system'

export interface LogMessage {
  id: string
  type: LogLevel
  message: string
  timestamp: number
}

export type WorkspaceLayout = 'preview-right' | 'preview-left' | 'stacked' | 'editor-focus'

export type MobilePane = 'preview' | 'editor' | 'console'

export interface PresetManifestEntry {
  id: string
  name: string
  type: PresetType
  files: string[]
}

export interface PresetManifest {
  presets: PresetManifestEntry[]
}

export interface IframeBridgeMessage {
  type: 'CONSOLE_LOG' | 'CONSOLE_WARN' | 'CONSOLE_ERROR' | 'CONSOLE_INFO' | 'RUNTIME_ERROR'
  payload: string
}

export const PRESET_TYPE_LABEL: Record<PresetType, string> = {
  webgl: 'WebGL',
  webgpu: 'WebGPU',
  houdini: 'Houdini',
  svg: 'SVG',
  threejs: 'Three.js',
  pixi: 'PixiJS',
}

export const PRESET_TYPE_DESCRIPTION: Record<PresetType, string> = {
  webgl: 'GLSL fragment + vertex pair',
  webgpu: 'WGSL compute or render pipeline',
  houdini: 'CSS Paint / Layout worklet',
  svg: 'Filter primitives + animation',
  threejs: 'Three.js scene scaffold',
  pixi: 'PixiJS 2D renderer',
}
