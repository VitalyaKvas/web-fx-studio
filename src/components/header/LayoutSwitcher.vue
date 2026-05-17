<script setup lang="ts">
import type { WorkspaceLayout } from '@/types'

interface Layout {
  id: WorkspaceLayout
  label: string
}

const LAYOUTS: Layout[] = [
  { id: 'preview-right', label: 'Preview right' },
  { id: 'preview-left', label: 'Preview left' },
  { id: 'stacked', label: 'Stacked' },
  { id: 'editor-focus', label: 'Editor focus' },
]

interface Props {
  value: WorkspaceLayout
}
defineProps<Props>()
const emit = defineEmits<{ change: [layout: WorkspaceLayout] }>()
</script>

<template>
  <div class="layout-switcher" role="radiogroup" aria-label="Workspace layout">
    <button
      v-for="layout in LAYOUTS"
      :key="layout.id"
      type="button"
      role="radio"
      :aria-checked="value === layout.id"
      :class="['layout-btn', { active: value === layout.id }]"
      :title="layout.label"
      @click="emit('change', layout.id)"
    >
      <svg
        v-if="layout.id === 'preview-right'"
        width="18"
        height="14"
        viewBox="0 0 18 14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      >
        <rect x="1" y="1" width="16" height="12" rx="1.5" />
        <line x1="10" y1="1" x2="10" y2="13" />
        <rect x="10.5" y="1.5" width="6.5" height="11" rx="1" fill="currentColor" fill-opacity="0.25" stroke="none" />
      </svg>
      <svg
        v-else-if="layout.id === 'preview-left'"
        width="18"
        height="14"
        viewBox="0 0 18 14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      >
        <rect x="1" y="1" width="16" height="12" rx="1.5" />
        <line x1="8" y1="1" x2="8" y2="13" />
        <rect x="1" y="1.5" width="6.5" height="11" rx="1" fill="currentColor" fill-opacity="0.25" stroke="none" />
      </svg>
      <svg
        v-else-if="layout.id === 'stacked'"
        width="18"
        height="14"
        viewBox="0 0 18 14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      >
        <rect x="1" y="1" width="16" height="12" rx="1.5" />
        <line x1="1" y1="7" x2="17" y2="7" />
        <rect x="1.5" y="1.5" width="15" height="5" rx="1" fill="currentColor" fill-opacity="0.25" stroke="none" />
      </svg>
      <svg
        v-else
        width="18"
        height="14"
        viewBox="0 0 18 14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      >
        <rect x="1" y="1" width="16" height="12" rx="1.5" />
        <rect x="11" y="8" width="5" height="4" rx="0.6" fill="currentColor" fill-opacity="0.6" stroke="none" />
      </svg>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.layout-switcher {
  display: inline-flex;
  background: var(--color-midnight-base);
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  padding: 2px;
  gap: 1px;
}
.layout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--color-ash-text);
  border-radius: 4px;
  transition:
    background 100ms,
    color 100ms;

  &:hover {
    color: var(--color-subtle-cream);
    background: rgba(255, 255, 255, 0.04);
  }
  &.active {
    background: rgba(33, 126, 255, 0.16);
    color: var(--color-accent-blue);
    box-shadow: inset 0 0 0 1px rgba(33, 126, 255, 0.35);
  }
}
</style>
