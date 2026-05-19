<script setup lang="ts">
import Icon from '@/components/shared/Icon.vue'
import KbdHint from '@/components/shared/KbdHint.vue'
import { useEditorStore } from '@/stores/editorStore'
import { fmtTimestamp } from '@/utils/slug'
import { exportPresetAsZip } from '@/utils/zipExport'
import { computed } from 'vue'
import LayoutSwitcher from './LayoutSwitcher.vue'

const editor = useEditorStore()

const presetLabel = computed(() => editor.currentPreset?.name ?? 'untitled')
const presetScope = computed(() => (editor.currentPreset?.isCustom ? 'local' : 'builtin'))
const dirty = computed(() => editor.anyDirty)

async function onExport(): Promise<void> {
  const preset = editor.currentPreset
  if (!preset) return
  try {
    const result = await exportPresetAsZip(preset)
    editor.appendLog(
      'log',
      `Packed <span class="file">${escape(preset.name)}</span> → ${result.archiveName}`,
    )
  } catch (err) {
    editor.appendLog('error', `Export failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

function onRun(): void {
  editor.runPreview()
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// surface fmtTimestamp so the import isn't accidentally dropped — used for log lines elsewhere.
void fmtTimestamp
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button
        class="icon-btn sidebar-toggle"
        type="button"
        title="Toggle sidebar"
        aria-label="Toggle sidebar"
        :aria-pressed="editor.sidebarVisible"
        :class="{ active: editor.sidebarVisible }"
        @click="editor.toggleSidebar"
      >
        <Icon name="sidebar" :size="14" />
      </button>
      <div class="brand">
        <span class="brand-mark" aria-hidden="true" />
        <span class="brand-name">Web<span class="accent">FX</span> Studio</span>
      </div>
      <div class="brand-divider" />
      <div class="project-title">
        <span>{{ presetScope }}</span>
        <span class="slash">/</span>
        <span class="file-name">{{ presetLabel }}</span>
        <span v-if="dirty" class="dirty-dot" title="Unsaved changes">●</span>
      </div>
    </div>
    <div class="header-right">
      <LayoutSwitcher :value="editor.layout" @change="editor.setLayout" />
      <div class="brand-divider" />
      <a
        class="icon-btn github-link"
        href="https://github.com/VitalyaKvas/web-fx-studio"
        target="_blank"
        rel="noopener noreferrer"
        title="View source on GitHub"
        aria-label="View source on GitHub"
      >
        <Icon name="github" :size="16" />
      </a>
      <button
        class="btn btn-ghost"
        type="button"
        :disabled="!editor.currentPreset"
        @click="onExport"
      >
        <Icon name="download" :size="13" />
        Export .ZIP
      </button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="!editor.currentPreset || editor.running"
        @click="onRun"
      >
        <span v-if="editor.running" class="spinner" aria-hidden="true" />
        <Icon v-else name="play" :size="12" />
        {{ editor.running ? 'Building' : 'Run' }}
        <KbdHint variant="accent">⌘R</KbdHint>
      </button>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: var(--color-graphite-2);
  border-bottom: 1px solid var(--color-border);
  height: 48px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: -0.02em;
}
.brand-mark {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 30% 30%, rgba(33, 126, 255, 0.9), rgba(33, 126, 255, 0) 60%),
    linear-gradient(135deg, #1f1f1f, #0a0a0a);
  border: 1px solid #2a2a2a;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 6px;
    border-radius: 2px;
    background:
      linear-gradient(90deg, transparent 48%, #fff 48%, #fff 52%, transparent 52%),
      linear-gradient(0deg, transparent 48%, #fff 48%, #fff 52%, transparent 52%);
    opacity: 0.85;
    mix-blend-mode: screen;
  }
}
.brand-name {
  font-weight: 500;
  font-size: 15px;

  .accent {
    color: var(--color-accent-blue);
  }
}
.brand-divider {
  width: 1px;
  height: 18px;
  background: var(--color-border-strong);
}

.project-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-ash-text);
  font-size: 13px;
  font-family: var(--font-geist-mono);

  .slash {
    color: var(--color-ash-dim);
  }
  .file-name {
    color: var(--color-subtle-cream);
  }
  .dirty-dot {
    color: var(--color-accent-blue);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  background: var(--color-interactive-teal);
  color: var(--color-highlight-white);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition:
    background 120ms,
    border-color 120ms,
    transform 60ms;

  &:hover:not(:disabled) {
    background: #3a3a39;
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &.btn-ghost {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.06);
    color: var(--color-subtle-cream);

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
    }
  }

  &.btn-accent {
    background: linear-gradient(180deg, #2f8aff, #1a6ee0);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 4px 16px rgba(33, 126, 255, 0.25);

    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
  }
}

.icon-btn {
  height: 24px;
  min-width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  background: transparent;
  color: var(--color-ash-text);
  border: 1px solid transparent;
  border-radius: 4px;

  &:hover {
    color: var(--color-highlight-white);
    background: rgba(255, 255, 255, 0.04);
  }
  &.active {
    color: var(--color-accent-blue);
    background: rgba(33, 126, 255, 0.12);
  }
}
.sidebar-toggle {
  height: 28px;
  min-width: 28px;
}
.github-link {
  height: 28px;
  min-width: 28px;
  text-decoration: none;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: var(--color-accent-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@include breakpoint-mobile {
  .layout-switcher,
  .header-right .icon-btn,
  .header-right .brand-divider,
  .header-right .btn-ghost {
    display: none;
  }
  .btn.btn-accent {
    height: 36px;
    padding: 0 12px;
    .kbd {
      display: none;
    }
  }
  .header {
    height: 52px;
    padding: 0 12px;
  }
  .brand-name {
    font-size: 14px;
  }
  .project-title {
    font-size: 12px;
  }
}
</style>
