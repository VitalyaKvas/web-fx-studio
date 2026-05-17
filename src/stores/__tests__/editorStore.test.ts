import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Preset } from '@/types'
import { useEditorStore } from '../editorStore'
import { usePresetsStore } from '../presetsStore'
import { __setDbForTesting } from '@/utils/db'
import { WebFxDatabase } from '@/utils/db'

function makePreset(id: string, files: string[] = ['index.html', 'main.js']): Preset {
  return {
    id,
    name: id,
    type: 'webgl',
    isCustom: false,
    activeFileName: files[0] ?? 'index.html',
    files: Object.fromEntries(
      files.map((n) => [
        n,
        { name: n, content: `// ${n}`, language: n.endsWith('.html') ? 'html' : 'javascript', isDirty: false },
      ]),
    ),
  }
}

describe('editorStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    try {
      await new WebFxDatabase().delete()
    } catch {
      // ignore
    }
    __setDbForTesting(null)
  })

  it('sets the active preset and seeds open tabs from its files', () => {
    const presets = usePresetsStore()
    presets.builtins = [makePreset('demo', ['index.html', 'main.js', 'shader.frag'])]
    const editor = useEditorStore()

    editor.setActivePreset('demo')
    expect(editor.currentPreset?.id).toBe('demo')
    expect(editor.openTabs).toEqual(['index.html', 'main.js', 'shader.frag'])
  })

  it('flips a file to dirty on updateFileContent and back to clean on run', async () => {
    const presets = usePresetsStore()
    presets.builtins = [makePreset('demo')]
    const editor = useEditorStore()
    editor.setActivePreset('demo')

    await editor.updateFileContent('main.js', 'console.log("edited")')
    expect(editor.dirtyFileNames.has('main.js')).toBe(true)
    expect(editor.anyDirty).toBe(true)

    editor.runPreview()
    // Simulate the iframe bridge reporting ready
    editor.handleBridgeMessage({ type: 'CONSOLE_INFO', payload: 'iframe bridge ready' })
    expect(editor.anyDirty).toBe(false)
  })

  it('appends logs with the right level and bumps error count', () => {
    const editor = useEditorStore()
    editor.appendLog('log', 'hello')
    editor.appendLog('error', 'boom')
    expect(editor.logs.length).toBe(2)
    expect(editor.errorCount).toBe(1)
  })

  it('handleBridgeMessage with RUNTIME_ERROR triggers errored state', () => {
    const editor = useEditorStore()
    editor.handleBridgeMessage({
      type: 'RUNTIME_ERROR',
      payload: 'Unexpected token at main.js:14:38',
    })
    expect(editor.errored).toBe(true)
    expect(editor.errorDetails?.fileName).toBe('main.js')
    expect(editor.errorDetails?.line).toBe(14)
    expect(editor.errorDetails?.column).toBe(38)
  })

  it('closeTab falls back to a neighboring tab when the active one closes', () => {
    const presets = usePresetsStore()
    presets.builtins = [makePreset('demo', ['index.html', 'main.js', 'shader.frag'])]
    const editor = useEditorStore()
    editor.setActivePreset('demo')

    presets.setActiveFile('demo', 'main.js')
    expect(editor.activeFileName).toBe('main.js')

    editor.closeTab('main.js')
    expect(editor.openTabs).toEqual(['index.html', 'shader.frag'])
    expect(editor.activeFileName).toBe('index.html')
  })

  it('createCustom persists to dexie and appears in the store', async () => {
    const presets = usePresetsStore()
    const preset = await presets.createCustom('My Shader', 'webgpu')
    expect(preset.isCustom).toBe(true)
    expect(presets.custom.some((p) => p.id === preset.id)).toBe(true)

    // Reset via a brand-new pinia instance and verify the persisted preset
    // reloads from Dexie. Setup-syntax stores don't expose $reset() so we
    // swap the active pinia container.
    setActivePinia(createPinia())
    const fresh = usePresetsStore()
    expect(fresh.custom.length).toBe(0)
    await fresh.init()
    expect(fresh.custom.some((p) => p.name === 'My Shader')).toBe(true)

    // vi was imported via spy mode but not yet used here — keep the linter quiet.
    expect(vi).toBeDefined()
  })
})
