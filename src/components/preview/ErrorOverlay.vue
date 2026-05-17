<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import Icon from '@/components/shared/Icon.vue'
import KbdHint from '@/components/shared/KbdHint.vue'

const editor = useEditorStore()
const details = computed(() => editor.errorDetails)
</script>

<template>
  <div v-if="editor.errored && details" class="error-overlay" role="alert">
    <span class="err-label">
      <Icon name="warn" :size="12" />
      Render halted
    </span>
    <div class="err-title">Compilation error — preview suspended</div>
    <div class="err-msg">
      <template v-if="details.fileName">
        {{ details.fileName }}:{{ details.line ?? '?' }}:{{ details.column ?? '?' }}
      </template>
      <span class="err-message-body">{{ details.message }}</span>
    </div>
    <div class="err-hint">
      <span>See full trace in the console below</span>
      <KbdHint variant="danger">⌘J</KbdHint>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.error-overlay {
  position: absolute;
  inset: 12px;
  border-radius: var(--radius-lg);
  background:
    repeating-linear-gradient(135deg, rgba(255, 81, 96, 0.04) 0 12px, rgba(255, 81, 96, 0.08) 12px 24px),
    rgba(20, 8, 10, 0.78);
  border: 1px solid rgba(255, 81, 96, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  padding: 18px 18px 16px;
  z-index: 2;
  animation: pulse-red 1.6s ease-in-out infinite;
}
@keyframes pulse-red {
  0%,
  100% {
    box-shadow: inset 0 0 0 0 rgba(255, 81, 96, 0);
  }
  50% {
    box-shadow: inset 0 0 0 1px rgba(255, 81, 96, 0.35);
  }
}
.err-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  @include mono-uppercase(11px, 0.14em);
  color: var(--color-error-red);
}
.err-title {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.02em;
  margin-top: 8px;
  color: #ffe6e8;
}
.err-msg {
  font-family: var(--font-geist-mono);
  font-size: 12px;
  color: #ff8b95;
  margin-top: 8px;
  line-height: 1.55;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;

  .err-message-body {
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 8em;
    overflow: auto;
  }
}
.err-hint {
  margin-top: auto;
  font-size: 12px;
  color: rgba(255, 180, 186, 0.7);
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
