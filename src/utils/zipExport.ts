import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { Preset } from '@/types'
import { slugify } from './slug'

export interface ExportResult {
  fileCount: number
  archiveName: string
  blob: Blob
}

/**
 * Packs every file of the preset into a .zip and triggers a browser download.
 * Returns the produced blob and archive name for callers that want to log size.
 */
export async function exportPresetAsZip(preset: Preset): Promise<ExportResult> {
  const zip = new JSZip()
  for (const file of Object.values(preset.files)) {
    zip.file(file.name, file.content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const archiveName = `${slugify(preset.name)}.zip`
  saveAs(blob, archiveName)
  return { fileCount: Object.keys(preset.files).length, archiveName, blob }
}
