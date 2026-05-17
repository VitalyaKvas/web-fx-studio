<script setup lang="ts">
import Icon from '@/components/shared/Icon.vue'
import { useEditorStore } from '@/stores/editorStore'
import { computed } from 'vue'
import ErrorOverlay from './ErrorOverlay.vue'
import IframeRenderer from './IframeRenderer.vue'

const editor = useEditorStore()
const presetName = computed(() => editor.currentPreset?.name ?? '—')
const statusLabel = computed(() => {
  if (editor.errored) return 'ERROR'
  if (editor.running) return 'BUILDING'
  return 'READY'
})
const isPip = computed(() => editor.layout === 'editor-focus')

function onReload(): void {
  editor.runPreview()
}

// PiP is anchored bottom-right, so dragging the top/left edges grows the
// pane in the opposite direction the cursor moves.
const PIP_MIN_W = 200
const PIP_MIN_H = 160

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function startResize(axes: 'x' | 'y' | 'both', event: PointerEvent): void {
  if (!isPip.value) return
  event.preventDefault()
  const startX = event.clientX
  const startY = event.clientY
  const startW = editor.pipSize.width
  const startH = editor.pipSize.height
  const target = event.currentTarget as HTMLElement
  const maxW = Math.max(PIP_MIN_W, window.innerWidth - 80)
  const maxH = Math.max(PIP_MIN_H, window.innerHeight - 160)
  target.setPointerCapture(event.pointerId)

  const onMove = (e: PointerEvent): void => {
    let w = startW
    let h = startH
    if (axes === 'x' || axes === 'both') {
      w = clamp(startW + (startX - e.clientX), PIP_MIN_W, maxW)
    }
    if (axes === 'y' || axes === 'both') {
      h = clamp(startH + (startY - e.clientY), PIP_MIN_H, maxH)
    }
    editor.setPipSize(w, h)
  }
  const onEnd = (e: PointerEvent): void => {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onEnd)
    target.removeEventListener('pointercancel', onEnd)
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onEnd)
  target.addEventListener('pointercancel', onEnd)
}
</script>

<template>
  <section class="preview-pane">
    <template v-if="isPip">
      <div
        class="resize-handle resize-y"
        title="Resize height"
        @pointerdown="startResize('y', $event)"
      />
      <div
        class="resize-handle resize-x"
        title="Resize width"
        @pointerdown="startResize('x', $event)"
      />
      <div
        class="resize-handle resize-both"
        title="Resize"
        @pointerdown="startResize('both', $event)"
      />
    </template>
    <div class="pane-header">
      <div class="pane-title">
        <span class="dot" aria-hidden="true">●</span>
        Preview
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

// Resize handles for the floating PiP (only rendered when layout === 'editor-focus').
// Placed inside the pane because the PiP has `overflow: hidden` for the rounded
// corner clip — the topmost / leftmost few pixels become the grab strip.
.resize-handle {
  position: absolute;
  z-index: 25;
  touch-action: none;
  user-select: none;
}
.resize-y {
  top: 0;
  left: 14px;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}
.resize-x {
  top: 14px;
  bottom: 0;
  left: 0;
  width: 6px;
  cursor: ew-resize;
}
.resize-both {
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  // Subtle visual cue so the user can find the corner grab spot.
  &::after {
    content: '';
    position: absolute;
    inset: 4px 8px 8px 4px;
    border-top: 1px solid var(--color-accent-blue);
    border-left: 1px solid var(--color-accent-blue);
    opacity: 0.35;
  }
  &:hover::after {
    opacity: 0.8;
  }
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
