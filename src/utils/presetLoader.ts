import type { FileItem, Preset, PresetManifest, PresetManifestEntry } from '@/types'
import { inferLanguage } from './slug'

const MANIFEST_URL = '/presets/presets-manifest.json'

async function fetchPresetFile(presetId: string, fileName: string): Promise<FileItem> {
  const url = `/presets/${presetId}/${fileName}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`)
  }
  const content = await res.text()
  return {
    name: fileName,
    content,
    language: inferLanguage(fileName),
    isDirty: false,
  }
}

async function buildPreset(entry: PresetManifestEntry): Promise<Preset> {
  const files: Record<string, FileItem> = {}
  for (const fileName of entry.files) {
    files[fileName] = await fetchPresetFile(entry.id, fileName)
  }
  const firstFile = entry.files[0] ?? 'index.html'
  // Prefer the most "interesting" file as the active one — the last non-html
  // file if present, otherwise the first listed file.
  const interesting = entry.files.find((n) => !n.endsWith('.html')) ?? firstFile
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    isCustom: false,
    files,
    activeFileName: interesting,
  }
}

export async function fetchBuiltinPresets(): Promise<Preset[]> {
  const res = await fetch(MANIFEST_URL)
  if (!res.ok) {
    throw new Error(`presets-manifest.json not reachable: ${res.status}`)
  }
  const manifest = (await res.json()) as PresetManifest
  const presets = await Promise.all(manifest.presets.map(buildPreset))
  return presets
}
