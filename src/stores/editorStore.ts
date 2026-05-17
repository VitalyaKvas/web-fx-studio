import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  LogLevel,
  LogMessage,
  MobilePane,
  Preset,
  WorkspaceLayout,
  IframeBridgeMessage,
} from '@/types'
import { newId } from '@/utils/slug'
import { usePresetsStore } from './presetsStore'

const MAX_LOGS = 500

export interface ErrorDetails {
  fileName?: string
  line?: number
  column?: number
  message: string
}

export const useEditorStore = defineStore('editor', () => {
  const presets = usePresetsStore()

  const currentPresetId = ref<string | null>(null)
  const openTabs = ref<string[]>([])
  const logs = ref<LogMessage[]>([])
  const running = ref(false)
  const errored = ref(false)
  const errorDetails = ref<ErrorDetails | null>(null)
  const layout = ref<WorkspaceLayout>('preview-right')
  const pipSize = ref({ width: 280, height: 220 })
  const sidebarVisible = ref(true)
  const mobilePane = ref<MobilePane>('editor')
  const showCreateModal = ref(false)
  /** Incremented every time runPreview() fires; iframe watches this to rebuild. */
  const runToken = ref(0)

  const currentPreset = computed<Preset | null>(() => {
    if (!currentPresetId.value) return null
    return presets.byId(currentPresetId.value) ?? null
  })

  const activeFileName = computed<string | null>(() => currentPreset.value?.activeFileName ?? null)

  const activeFile = computed(() => {
    const preset = currentPreset.value
    if (!preset || !activeFileName.value) return null
    return preset.files[activeFileName.value] ?? null
  })

  const anyDirty = computed(() => {
    const preset = currentPreset.value
    if (!preset) return false
    return Object.values(preset.files).some((f) => f.isDirty)
  })

  const dirtyFileNames = computed<Set<string>>(() => {
    const preset = currentPreset.value
    if (!preset) return new Set()
    return new Set(Object.values(preset.files).filter((f) => f.isDirty).map((f) => f.name))
  })

  const errorCount = computed(() => logs.value.filter((l) => l.type === 'error').length)
  const warnCount = computed(() => logs.value.filter((l) => l.type === 'warn').length)

  function appendLog(type: LogLevel, message: string): void {
    logs.value.push({
      id: newId(),
      type,
      message,
      timestamp: Date.now(),
    })
    if (logs.value.length > MAX_LOGS) {
      logs.value.splice(0, logs.value.length - MAX_LOGS)
    }
  }

  function clearLogs(): void {
    logs.value = []
  }

  function clearErrorLogs(): void {
    logs.value = logs.value.filter((l) => l.type !== 'error')
  }

  function setActivePreset(id: string): void {
    if (!presets.byId(id)) return
    currentPresetId.value = id
    const preset = presets.byId(id)
    if (!preset) return
    const fileNames = Object.keys(preset.files)
    // Reset tab strip to at most the first three files; ensure activeFile is included.
    const seed = fileNames.slice(0, 3)
    if (preset.activeFileName && !seed.includes(preset.activeFileName)) {
      seed.push(preset.activeFileName)
    }
    openTabs.value = seed
    errored.value = false
    errorDetails.value = null
  }

  function openFile(fileName: string): void {
    const preset = currentPreset.value
    if (!preset || !preset.files[fileName]) return
    if (!openTabs.value.includes(fileName)) {
      openTabs.value = [...openTabs.value, fileName]
    }
    presets.setActiveFile(preset.id, fileName)
  }

  function closeTab(fileName: string): void {
    const preset = currentPreset.value
    if (!preset) return
    const idx = openTabs.value.indexOf(fileName)
    if (idx === -1) return
    const next = openTabs.value.filter((n) => n !== fileName)
    openTabs.value = next
    if (preset.activeFileName === fileName && next.length > 0) {
      const fallback = next[Math.max(0, idx - 1)] ?? next[0]
      if (fallback) presets.setActiveFile(preset.id, fallback)
    }
  }

  async function updateFileContent(fileName: string, content: string): Promise<void> {
    const preset = currentPreset.value
    if (!preset || !preset.files[fileName]) return
    await presets.updateFileContent(preset.id, fileName, content)
    if (!preset.files[fileName]?.isDirty) {
      presets.setFileDirty(preset.id, fileName, true)
    }
  }

  function setLayout(next: WorkspaceLayout): void {
    layout.value = next
  }

  function setPipSize(width: number, height: number): void {
    pipSize.value = { width, height }
  }

  function toggleSidebar(): void {
    sidebarVisible.value = !sidebarVisible.value
  }

  function setMobilePane(pane: MobilePane): void {
    mobilePane.value = pane
  }

  function openCreateModal(): void {
    showCreateModal.value = true
  }
  function closeCreateModal(): void {
    showCreateModal.value = false
  }

  function setErrored(state: boolean, details: ErrorDetails | null = null): void {
    errored.value = state
    errorDetails.value = state ? details : null
  }

  function runPreview(): void {
    const preset = currentPreset.value
    if (!preset) return
    running.value = true
    clearErrorLogs()
    setErrored(false, null)
    appendLog('system', `Run requested — bundling <span class="file">${preset.name}</span>`)
    // The iframe component will pick up the bumped token, rebuild srcdoc, then
    // post a CONSOLE_INFO("iframe bridge ready") which we use to flip running→false.
    runToken.value++
  }

  function onIframeReady(): void {
    const preset = currentPreset.value
    running.value = false
    if (preset) presets.clearAllDirty(preset.id)
  }

  function handleBridgeMessage(msg: IframeBridgeMessage): void {
    if (msg.type === 'RUNTIME_ERROR') {
      appendLog('error', escapeForLog(msg.payload))
      setErrored(true, parseErrorPayload(msg.payload))
    } else if (msg.type === 'CONSOLE_ERROR') {
      appendLog('error', escapeForLog(msg.payload))
      setErrored(true, parseErrorPayload(msg.payload))
    } else if (msg.type === 'CONSOLE_WARN') {
      appendLog('warn', escapeForLog(msg.payload))
    } else if (msg.type === 'CONSOLE_INFO' || msg.type === 'CONSOLE_LOG') {
      // The bridge ready signal flips running off — first info message after a run.
      if (running.value && msg.payload === 'iframe bridge ready') {
        onIframeReady()
        return
      }
      appendLog('log', escapeForLog(msg.payload))
    }
  }

  return {
    currentPresetId,
    currentPreset,
    activeFileName,
    activeFile,
    openTabs,
    logs,
    running,
    errored,
    errorDetails,
    layout,
    pipSize,
    sidebarVisible,
    mobilePane,
    showCreateModal,
    runToken,
    anyDirty,
    dirtyFileNames,
    errorCount,
    warnCount,
    appendLog,
    clearLogs,
    clearErrorLogs,
    setActivePreset,
    openFile,
    closeTab,
    updateFileContent,
    setLayout,
    setPipSize,
    toggleSidebar,
    setMobilePane,
    openCreateModal,
    closeCreateModal,
    setErrored,
    runPreview,
    handleBridgeMessage,
  }
})

function escapeForLog(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseErrorPayload(payload: string): ErrorDetails {
  // Match patterns like "file.wgsl:14:38" inside the message.
  const m = payload.match(/([\w./-]+):(\d+):(\d+)/)
  if (m) {
    return {
      fileName: m[1],
      line: Number(m[2]),
      column: Number(m[3]),
      message: payload,
    }
  }
  return { message: payload }
}
