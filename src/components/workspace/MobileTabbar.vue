<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import type { MobilePane } from '@/types'

const editor = useEditorStore()

const errorCount = computed(() => editor.errorCount)
const dirty = computed(() => editor.anyDirty)

function setPane(p: MobilePane): void {
  editor.setMobilePane(p)
}
</script>

<template>
  <nav class="mobile-tabbar" aria-label="Active pane">
    <button
      type="button"
      :class="['mtab', { active: editor.mobilePane === 'preview' }]"
      @click="setPane('preview')"
    >
      <span :class="['mtab-dot', editor.errored ? 'bad' : 'good']" aria-hidden="true" />
      Preview
    </button>
    <button
      type="button"
      :class="['mtab', { active: editor.mobilePane === 'editor' }]"
      @click="setPane('editor')"
    >
      Editor
      <span v-if="dirty" class="mtab-badge" aria-label="Unsaved changes">●</span>
    </button>
    <button
      type="button"
      :class="['mtab', { active: editor.mobilePane === 'console' }]"
      @click="setPane('console')"
    >
      Console
      <span v-if="errorCount > 0" class="mtab-badge err" :aria-label="`${errorCount} errors`">
        {{ errorCount }}
      </span>
    </button>
  </nav>
</template>

<style lang="scss" scoped>
.mobile-tabbar {
  display: none;

  @include breakpoint-mobile {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: var(--color-graphite-2);
    border-top: 1px solid var(--color-border);
    height: 56px;
  }
}

.mtab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--color-ash-text);
  font-size: 11px;
  font-family: var(--font-geist-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  position: relative;

  &.active {
    color: var(--color-accent-blue);
    background: linear-gradient(180deg, rgba(33, 126, 255, 0.1), transparent 70%);

    &::before {
      content: '';
      position: absolute;
      left: 28%;
      right: 28%;
      top: 0;
      height: 2px;
      background: var(--color-accent-blue);
      border-radius: 0 0 2px 2px;
    }
  }
}

.mtab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.good {
    background: var(--color-success-green);
    box-shadow: 0 0 8px var(--color-success-green);
  }
  &.bad {
    background: var(--color-error-red);
    box-shadow: 0 0 8px var(--color-error-red);
  }
}

.mtab-badge {
  position: absolute;
  top: 6px;
  right: calc(50% - 32px);
  background: var(--color-accent-blue);
  color: #fff;
  border-radius: 999px;
  font-size: 9px;
  padding: 0 5px;
  min-width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  letter-spacing: 0;

  &.err {
    background: var(--color-error-red);
  }
}
</style>
