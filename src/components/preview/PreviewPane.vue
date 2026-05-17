<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import IframeRenderer from './IframeRenderer.vue'
import ErrorOverlay from './ErrorOverlay.vue'
import Icon from '@/components/shared/Icon.vue'

const editor = useEditorStore()
const presetName = computed(() => editor.currentPreset?.name ?? '—')
const statusLabel = computed(() => {
  if (editor.errored) return 'ERROR'
  if (editor.running) return 'BUILDING'
  return 'READY'
})

function onReload(): void {
  editor.runPreview()
}
</script>

<template>
  <section class="preview-pane">
    <div class="pane-header">
      <div class="pane-title">
        <span class="dot" aria-hidden="true">●</span>
        Preview · iframe
      </div>
      <div class="pane-actions">
        <button type="button" class="icon-btn active" title="100% scale">1×</button>
        <button type="button" class="icon-btn" title="200% scale">2×</button>
        <button type="button" class="icon-btn" title="Fit to pane">FIT</button>
        <button type="button" class="icon-btn" title="Reload preview" @click="onReload">
          <Icon name="refresh" :size="12" />
        </button>
      </div>
    </div>
    <div class="preview-stage">
      <div :class="['preview-canvas', { flash: editor.running }]">
        <IframeRenderer />
        <ErrorOverlay />
        <div v-if="editor.running && !editor.errored" class="building-overlay">
          <span class="spinner" />
          <span>compiling {{ presetName }}…</span>
        </div>
      </div>
    </div>
    <div class="preview-footer">
      <span class="status">
        <span :class="['dot', editor.errored ? 'bad' : 'good']" aria-hidden="true" />
        <span :class="editor.errored ? 'status-bad' : 'status-good'">{{ statusLabel }}</span>
        <span class="muted">{{ presetName }}</span>
      </span>
      <span class="muted">520 × 520 · iframe · sandbox</span>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  background: var(--color-midnight-base);
  border-right: 1px solid var(--color-border);
  min-height: 0;
}
.pane-header {
  @include pane-header;
}
.pane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  @include mono-uppercase(12px, 0.06em);
  color: var(--color-ash-text);

  .dot {
    color: var(--color-accent-blue);
    font-size: 10px;
  }
}
.pane-actions {
  display: flex;
  align-items: center;
  gap: 4px;
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
  font-size: 11px;
  font-family: var(--font-geist-mono);

  &:hover {
    color: var(--color-highlight-white);
    background: rgba(255, 255, 255, 0.04);
  }
  &.active {
    color: var(--color-accent-blue);
    background: rgba(33, 126, 255, 0.1);
  }
}
.preview-stage {
  flex: 1;
  position: relative;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 40%, #1a1a1a 0%, #0e0e0e 60%, #0a0a0a 100%);
  overflow: hidden;
  min-height: 0;
  padding: 16px;
}
.preview-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 560px;
  max-height: 560px;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #0a0a0a;
  border: 1px solid rgba(33, 126, 255, 0.25);
  box-shadow: var(--shadow-xl);
}
.flash {
  animation: flash 700ms ease-out;
}
@keyframes flash {
  0% {
    box-shadow:
      var(--shadow-xl),
      inset 0 0 0 2px rgba(33, 126, 255, 0.5);
  }
  100% {
    box-shadow: var(--shadow-xl);
  }
}
.building-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  font-family: var(--font-geist-mono);
  font-size: 12px;
  color: var(--color-accent-blue);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  gap: 12px;
  grid-template-rows: auto auto;
  align-content: center;
  justify-items: center;

  .spinner {
    width: 22px;
    height: 22px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-top-color: var(--color-accent-blue);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-footer {
  flex-shrink: 0;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-top: 1px solid var(--color-border);
  font-family: var(--font-geist-mono);
  font-size: 11px;
  color: var(--color-ash-dim);
  background: var(--color-graphite-2);

  .status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .status-good {
    color: var(--color-success-green);
  }
  .status-bad {
    color: var(--color-error-red);
  }
  .muted {
    color: var(--color-ash-dim);
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;

    &.good {
      background: var(--color-success-green);
      box-shadow: 0 0 8px var(--color-success-green);
    }
    &.bad {
      background: var(--color-error-red);
      box-shadow: 0 0 8px var(--color-error-red);
    }
  }
}
</style>
