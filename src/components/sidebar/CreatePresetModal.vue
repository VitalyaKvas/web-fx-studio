<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { PresetType } from '@/types'
import { PRESET_TYPE_LABEL, PRESET_TYPE_DESCRIPTION } from '@/types'
import { useEditorStore } from '@/stores/editorStore'
import { usePresetsStore } from '@/stores/presetsStore'
import { slugify } from '@/utils/slug'
import Icon from '@/components/shared/Icon.vue'

const editor = useEditorStore()
const presets = usePresetsStore()

const emit = defineEmits<{ close: [] }>()

const name = ref('')
const tech = ref<PresetType>('webgpu')
const submitting = ref(false)

const nameInput = ref<HTMLInputElement | null>(null)
const dialogEl = ref<HTMLElement | null>(null)
const triggerEl = ref<Element | null>(null)

const previewSlug = computed(() => slugify(name.value || 'untitled'))
const canSubmit = computed(() => !!name.value.trim() && !submitting.value)

const TYPES = Object.keys(PRESET_TYPE_LABEL) as PresetType[]

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const preset = await presets.createCustom(name.value.trim(), tech.value)
    editor.setActivePreset(preset.id)
    editor.appendLog(
      'log',
      `Scaffolded preset <span class="file">${escape(preset.name)}</span> (${PRESET_TYPE_LABEL[preset.type]})`,
    )
    editor.appendLog(
      'log',
      `Persisted to <span class="file">IndexedDB://webfx/customPresets/${preset.id}</span>`,
    )
    close()
  } catch (err) {
    editor.appendLog(
      'error',
      `Create failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    submitting.value = false
  }
}

function close(): void {
  emit('close')
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    return
  }
  if (e.key === 'Tab') {
    const focusable = dialogEl.value?.querySelectorAll<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])',
    )
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

onMounted(async () => {
  triggerEl.value = document.activeElement
  await nextTick()
  nameInput.value?.focus()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (triggerEl.value instanceof HTMLElement) triggerEl.value.focus()
})

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<template>
  <div class="modal-backdrop" @click.self="close">
    <div
      ref="dialogEl"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-preset-title"
    >
      <div class="modal-header">
        <div id="create-preset-title" class="modal-title">New preset</div>
        <button type="button" class="icon-btn" aria-label="Close" @click="close">
          <Icon name="close" :size="14" />
        </button>
      </div>
      <form class="modal-body" @submit.prevent="onSubmit">
        <div>
          <label for="preset-name" class="field-label">Preset name</label>
          <input
            id="preset-name"
            ref="nameInput"
            v-model="name"
            class="text-input"
            placeholder="My Super Shader"
            autocomplete="off"
            maxlength="64"
          />
        </div>
        <div>
          <span class="field-label">Technology</span>
          <div class="tech-grid" role="radiogroup" aria-label="Technology">
            <button
              v-for="t in TYPES"
              :key="t"
              type="button"
              role="radio"
              :aria-checked="tech === t"
              :class="['tech-card', { selected: tech === t }]"
              @click="tech = t"
            >
              <span class="tech-tag">{{ PRESET_TYPE_LABEL[t].toUpperCase() }}</span>
              <span class="tech-name">{{ PRESET_TYPE_LABEL[t] }}</span>
              <span class="tech-desc">{{ PRESET_TYPE_DESCRIPTION[t] }}</span>
            </button>
          </div>
        </div>
        <div class="path-preview">
          <span class="comment">// </span>
          stored locally — IndexedDB · key:
          <span class="key">webfx.customPresets.{{ previewSlug }}</span>
        </div>
        <div class="modal-footer-row">
          <button type="button" class="btn btn-ghost" @click="close">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
            {{ submitting ? 'Scaffolding…' : 'Scaffold preset' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: var(--z-modal);
  animation: fadeIn 140ms ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.modal {
  width: 460px;
  max-width: calc(100vw - 24px);
  background: var(--color-graphite-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.6),
    var(--shadow-xl);
  overflow: hidden;
  animation: popIn 180ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
@keyframes popIn {
  from {
    transform: translateY(6px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
.modal-header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal-footer-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
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
}
.field-label {
  display: block;
  @include mono-uppercase(11px, 0.1em);
  color: var(--color-ash-text);
  margin-bottom: 6px;
}
.text-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  background: var(--color-midnight-base);
  border: 1px solid var(--color-border-strong);
  color: var(--color-highlight-white);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: var(--color-accent-blue);
    box-shadow: 0 0 0 3px rgba(33, 126, 255, 0.18);
  }
}
.tech-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.tech-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--color-midnight-base);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: left;
  color: var(--color-subtle-cream);
  cursor: pointer;
  position: relative;

  &:hover {
    border-color: var(--color-border-strong);
  }
  &.selected {
    border-color: var(--color-accent-blue);
    background: rgba(33, 126, 255, 0.06);
    box-shadow: 0 0 0 1px var(--color-accent-blue) inset;
  }
  .tech-name {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .tech-tag {
    font-family: var(--font-geist-mono);
    font-size: 10px;
    letter-spacing: 0.08em;
    color: var(--color-accent-blue);
  }
  .tech-desc {
    font-size: 12px;
    color: var(--color-ash-text);
  }
}
.path-preview {
  font-size: 11px;
  color: var(--color-ash-dim);
  font-family: var(--font-geist-mono);
  padding: 8px 10px;
  background: var(--color-midnight-base);
  border-radius: 4px;
  border: 1px solid var(--color-border);
  overflow-wrap: break-word;

  .comment {
    color: var(--color-code-comment-gray);
  }
  .key {
    color: var(--color-code-keyword-gold);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 14px;
  background: var(--color-interactive-teal);
  color: var(--color-highlight-white);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}
.btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
  color: var(--color-subtle-cream);

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
}
.btn-primary {
  background: var(--color-highlight-white);
  color: #0c0c0c;
  border-color: transparent;

  &:hover:not(:disabled) {
    background: #eaeaea;
  }
}
</style>
