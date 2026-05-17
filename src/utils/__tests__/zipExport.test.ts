import { describe, it, expect, vi, beforeEach } from 'vitest'
import JSZip from 'jszip'
import { exportPresetAsZip } from '../zipExport'
import type { Preset } from '@/types'

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}))

const samplePreset: Preset = {
  id: 'demo',
  name: 'Demo Preset',
  type: 'webgl',
  isCustom: false,
  activeFileName: 'main.js',
  files: {
    'index.html': {
      name: 'index.html',
      content: '<!doctype html><html></html>',
      language: 'html',
      isDirty: false,
    },
    'main.js': {
      name: 'main.js',
      content: 'console.log("hi");',
      language: 'javascript',
      isDirty: false,
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportPresetAsZip', () => {
  it('adds every file from the preset to the archive', async () => {
    const { fileCount, archiveName, blob } = await exportPresetAsZip(samplePreset)
    expect(fileCount).toBe(2)
    expect(archiveName).toBe('demo-preset.zip')
    expect(blob).toBeInstanceOf(Blob)

    const restored = await JSZip.loadAsync(blob)
    expect(Object.keys(restored.files).sort()).toEqual(['index.html', 'main.js'])
    const mainJs = await restored.file('main.js')!.async('string')
    expect(mainJs).toBe('console.log("hi");')
  })

  it('calls file-saver saveAs with the slugified name', async () => {
    const { saveAs } = await import('file-saver')
    await exportPresetAsZip(samplePreset)
    expect(saveAs).toHaveBeenCalledTimes(1)
    expect(vi.mocked(saveAs).mock.calls[0]?.[1]).toBe('demo-preset.zip')
  })
})
