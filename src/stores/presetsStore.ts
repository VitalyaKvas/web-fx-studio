import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Preset, PresetType } from '@/types'
import { getDb } from '@/utils/db'
import { fetchBuiltinPresets } from '@/utils/presetLoader'
import { defaultActiveFile, scaffoldForTech } from '@/utils/presetScaffolds'
import { newId, slugify } from '@/utils/slug'

export const usePresetsStore = defineStore('presets', () => {
  const builtins = ref<Preset[]>([])
  const custom = ref<Preset[]>([])
  const ready = ref(false)
  const loadError = ref<string | null>(null)

  const all = computed<Preset[]>(() => [...builtins.value, ...custom.value])

  function byId(id: string): Preset | undefined {
    return all.value.find((p) => p.id === id)
  }

  async function loadCustomFromDb(): Promise<void> {
    const db = getDb()
    const rows = await db.customPresets.toArray()
    custom.value = rows
  }

  async function init(): Promise<{ builtinError?: string; customError?: string }> {
    if (ready.value) return {}
    const result: { builtinError?: string; customError?: string } = {}
    try {
      builtins.value = await fetchBuiltinPresets()
    } catch (err) {
      result.builtinError = err instanceof Error ? err.message : String(err)
      builtins.value = []
    }
    try {
      await loadCustomFromDb()
    } catch (err) {
      result.customError = err instanceof Error ? err.message : String(err)
      custom.value = []
    }
    loadError.value = result.builtinError ?? result.customError ?? null
    ready.value = true
    return result
  }

  function makeUniqueCustomId(base: string): string {
    const slug = slugify(base)
    const ids = new Set(all.value.map((p) => p.id))
    if (!ids.has(slug)) return slug
    let i = 2
    while (ids.has(`${slug}-${i}`)) i++
    return `${slug}-${i}`
  }

  async function createCustom(name: string, type: PresetType): Promise<Preset> {
    const trimmed = name.trim() || 'Untitled'
    const id = makeUniqueCustomId(trimmed) || newId()
    const files = scaffoldForTech(type)
    const preset: Preset = {
      id,
      name: trimmed,
      type,
      isCustom: true,
      files,
      activeFileName: defaultActiveFile(files),
    }
    await getDb().customPresets.put(preset)
    custom.value = [...custom.value, preset]
    return preset
  }

  async function deleteCustom(id: string): Promise<void> {
    await getDb().customPresets.delete(id)
    custom.value = custom.value.filter((p) => p.id !== id)
  }

  async function updateFileContent(
    presetId: string,
    fileName: string,
    content: string,
  ): Promise<void> {
    const preset = byId(presetId)
    if (!preset) return
    const existing = preset.files[fileName]
    if (!existing) return
    existing.content = content
    if (preset.isCustom) {
      // Persist the full preset record; the customPresets table uses 'id' as
      // the primary key so put() is an upsert.
      await getDb().customPresets.put({ ...preset })
    }
  }

  function setFileDirty(presetId: string, fileName: string, dirty: boolean): void {
    const preset = byId(presetId)
    const file = preset?.files[fileName]
    if (file) file.isDirty = dirty
  }

  function clearAllDirty(presetId: string): void {
    const preset = byId(presetId)
    if (!preset) return
    for (const file of Object.values(preset.files)) {
      file.isDirty = false
    }
  }

  function setActiveFile(presetId: string, fileName: string): void {
    const preset = byId(presetId)
    if (preset && preset.files[fileName]) {
      preset.activeFileName = fileName
    }
  }

  return {
    builtins,
    custom,
    ready,
    loadError,
    all,
    byId,
    init,
    createCustom,
    deleteCustom,
    updateFileContent,
    setFileDirty,
    clearAllDirty,
    setActiveFile,
  }
})
