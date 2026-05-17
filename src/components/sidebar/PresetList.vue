<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { usePresetsStore } from '@/stores/presetsStore'
import Icon from '@/components/shared/Icon.vue'
import PresetItem from './PresetItem.vue'

const editor = useEditorStore()
const presets = usePresetsStore()

const builtins = computed(() => presets.builtins)
const custom = computed(() => presets.custom)

function onSelect(id: string): void {
  editor.setActivePreset(id)
}

async function onDelete(id: string): Promise<void> {
  try {
    await presets.deleteCustom(id)
    editor.appendLog('warn', `Removed local preset <span class="file">${escape(id)}</span>`)
    if (editor.currentPresetId === id) {
      const fallback = presets.builtins[0]?.id ?? presets.custom[0]?.id
      if (fallback) editor.setActivePreset(fallback)
    }
  } catch (err) {
    editor.appendLog('error', `Delete failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

function onCreate(): void {
  editor.openCreateModal()
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<template>
  <aside class="sidebar" aria-label="Presets">
    <div class="sidebar-section">
      <div class="sidebar-title">
        <span>Built-in</span>
        <span class="count">{{ builtins.length }}</span>
      </div>
      <div class="preset-list" role="listbox" aria-label="Built-in presets">
        <PresetItem
          v-for="p in builtins"
          :key="p.id"
          :preset="p"
          :active="editor.currentPresetId === p.id"
          @select="onSelect"
          @delete="onDelete"
        />
      </div>
    </div>

    <div class="sidebar-divider" aria-hidden="true" />

    <div class="sidebar-section grow">
      <div class="sidebar-title">
        <span>My presets</span>
        <span class="count">{{ custom.length }}</span>
      </div>
      <div class="preset-list" role="listbox" aria-label="Local presets">
        <div v-if="custom.length === 0" class="empty-hint">
          No local presets yet. Use the button below to scaffold one — it'll persist in IndexedDB.
        </div>
        <PresetItem
          v-for="p in custom"
          :key="p.id"
          :preset="p"
          :active="editor.currentPresetId === p.id"
          @select="onSelect"
          @delete="onDelete"
        />
      </div>
    </div>

    <div class="sidebar-footer">
      <button type="button" class="create-btn" @click="onCreate">
        <Icon name="plus" :size="14" />
        Create new preset
      </button>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.sidebar {
  background: var(--color-graphite-2);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  min-height: 0;

  @include breakpoint-mobile {
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
    overflow-y: hidden;
    height: 56px;
    padding: 6px 10px;
    align-items: center;
    gap: 6px;
  }
}
.sidebar-section {
  padding: 12px 12px 4px;

  &.grow {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  @include breakpoint-mobile {
    padding: 0;
  }
}
.sidebar-title {
  @include mono-uppercase(11px, 0.1em);
  color: var(--color-ash-dim);
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .count {
    color: var(--color-ash-dim);
    background: rgba(255, 255, 255, 0.04);
    border-radius: 999px;
    padding: 1px 6px;
    font-size: 10px;
    letter-spacing: 0;
    text-transform: none;
  }

  @include breakpoint-mobile {
    display: none;
  }
}
.sidebar-divider {
  height: 1px;
  background: var(--color-border);
  margin: 6px 12px;

  @include breakpoint-mobile {
    display: none;
  }
}
.preset-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px 8px;

  @include breakpoint-mobile {
    flex-direction: row;
    padding: 0;
    gap: 6px;
  }
}
.empty-hint {
  padding: 12px 8px;
  color: var(--color-ash-dim);
  font-size: 12px;
  line-height: 1.55;
}
.sidebar-footer {
  margin-top: auto;
  padding: 12px;
  border-top: 1px solid var(--color-border);

  @include breakpoint-mobile {
    display: none;
  }
}
.create-btn {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(33, 126, 255, 0.08);
  color: var(--color-accent-blue);
  border: 1px dashed rgba(33, 126, 255, 0.4);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;

  &:hover {
    background: rgba(33, 126, 255, 0.14);
  }
}
</style>
