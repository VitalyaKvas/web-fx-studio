<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { fmtTimestamp } from '@/utils/slug'

type ConsoleTab = 'console' | 'problems' | 'network'

const editor = useEditorStore()
const tab = ref<ConsoleTab>('console')
const input = ref('')
const bodyRef = ref<HTMLElement | null>(null)

const errorLogs = computed(() => editor.logs.filter((l) => l.type === 'error'))

watch(
  () => editor.logs.length,
  async () => {
    await nextTick()
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  },
)

function levelGlyph(level: string): string {
  switch (level) {
    case 'error':
      return '✕'
    case 'warn':
      return '▲'
    case 'system':
      return '◆'
    default:
      return '›'
  }
}

function onClear(): void {
  editor.clearLogs()
}

function onSubmit(): void {
  const expr = input.value.trim()
  if (!expr) return
  editor.appendLog('log', `<span class="prompt-echo">› ${escape(expr)}</span>`)
  editor.appendLog('log', evalDemo(expr))
  input.value = ''
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function evalDemo(expr: string): string {
  // The REPL is a thin echo — real eval inside the iframe would require a
  // host→guest channel; design parity is more important than functional eval here.
  if (/version|webgl/i.test(expr))
    return '<span class="accent">"WebGL 2.0 (OpenGL ES 3.0 Chromium)"</span>'
  if (/navigator\.gpu|gpu/i.test(expr))
    return '<span class="accent">GPUAdapter</span> { features: Set(…), limits: {…} }'
  if (/preset|file/i.test(expr)) return '[\'index.html\', \'main.js\', \'shader.wgsl\']'
  return '<span class="dim">undefined</span>'
}
</script>

<template>
  <section class="console" aria-label="Console">
    <div class="console-header">
      <div class="console-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'console'"
          :class="['console-tab', { active: tab === 'console' }]"
          @click="tab = 'console'"
        >
          Console
          <span :class="['badge', { err: editor.errorCount > 0 }]">{{ editor.logs.length }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'problems'"
          :class="['console-tab', { active: tab === 'problems' }]"
          @click="tab = 'problems'"
        >
          Problems
          <span v-if="editor.errorCount > 0" class="badge err">{{ editor.errorCount }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'network'"
          :class="['console-tab', { active: tab === 'network' }]"
          @click="tab = 'network'"
        >
          Network
        </button>
      </div>
      <div class="console-actions">
        <button type="button" class="icon-btn" title="Clear console" @click="onClear">CLEAR</button>
        <button type="button" class="icon-btn" title="Filter logs">FILTER</button>
      </div>
    </div>

    <div ref="bodyRef" class="console-body">
      <template v-if="tab === 'console'">
        <div v-if="editor.logs.length === 0" class="empty">No logs yet — run the preview.</div>
        <div v-for="l in editor.logs" :key="l.id" :class="['log', l.type]">
          <span class="ts">[{{ fmtTimestamp(l.timestamp) }}]</span>
          <span class="lvl">{{ levelGlyph(l.type) }}</span>
          <span class="msg" v-html="l.message"></span>
        </div>
      </template>
      <template v-else-if="tab === 'problems'">
        <div v-if="errorLogs.length === 0" class="empty">No problems detected in current build.</div>
        <div v-for="l in errorLogs" :key="l.id" class="problem">
          <span class="bullet" aria-hidden="true">●</span>
          <span class="msg" v-html="l.message"></span>
        </div>
      </template>
      <template v-else>
        <div class="empty">Client-only — no network requests. All compilation happens in-browser.</div>
      </template>
    </div>

    <form class="console-prompt" @submit.prevent="onSubmit">
      <span class="chev" aria-hidden="true">›</span>
      <input
        v-model="input"
        type="text"
        placeholder="evaluate expression — e.g. gl.getParameter(gl.VERSION)"
        aria-label="Console expression"
      />
      <span class="kbd">↵</span>
    </form>
  </section>
</template>

<style lang="scss" scoped>
.console {
  display: flex;
  flex-direction: column;
  background: var(--color-graphite-2);
  min-height: 0;
  border-top: 1px solid var(--color-border);
}
.console-header {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}
.console-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}
.console-tab {
  padding: 6px 10px;
  @include mono-uppercase(11px, 0.08em);
  color: var(--color-ash-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover {
    color: var(--color-highlight-white);
  }
  &.active {
    color: var(--color-highlight-white);
    background: rgba(255, 255, 255, 0.04);

    .badge {
      background: rgba(33, 126, 255, 0.16);
      color: var(--color-accent-blue);
    }
  }

  .badge {
    background: rgba(255, 255, 255, 0.06);
    color: var(--color-ash-text);
    border-radius: 999px;
    padding: 1px 6px;
    font-size: 10px;
    letter-spacing: 0;
    text-transform: none;

    &.err {
      background: rgba(255, 81, 96, 0.18);
      color: var(--color-error-red);
    }
  }
}
.console-actions {
  display: flex;
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
}

.console-body {
  flex: 1;
  overflow: auto;
  padding: 8px 12px 14px;
  font-family: var(--font-geist-mono);
  font-size: 12px;
  color: var(--color-subtle-cream);
}
.empty {
  color: var(--color-ash-text);
  padding: 8px;
  font-size: 12px;
  line-height: 1.7;
}
.log {
  display: grid;
  grid-template-columns: 78px 18px 1fr;
  gap: 8px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.025);
  align-items: start;
  letter-spacing: -0.01em;

  .ts {
    color: var(--color-ash-dim);
  }
  .lvl {
    font-size: 11px;
  }
  .msg {
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--color-subtle-cream);
  }

  &.log .lvl,
  &.system .lvl {
    color: var(--color-code-comment-gray);
  }
  &.log .msg,
  &.system .msg {
    color: var(--color-ash-text);
  }
  &.warn .lvl {
    color: var(--color-code-keyword-gold);
  }
  &.warn .msg {
    color: #e9d6a4;
  }
  &.error .lvl {
    color: var(--color-error-red);
  }
  &.error .msg {
    color: #ffb1b8;
  }

  :deep(.accent) {
    color: var(--color-accent-blue);
  }
  :deep(.file) {
    color: var(--color-code-keyword-gold);
  }
  :deep(.prompt-echo) {
    color: var(--color-ash-text);
  }
  :deep(.dim) {
    color: var(--color-ash-dim);
  }
}
.problem {
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  .bullet {
    color: var(--color-error-red);
  }
}

.console-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--color-border);
  font-family: var(--font-geist-mono);
  font-size: 12px;
  color: var(--color-ash-text);
  background: var(--color-graphite-surface);
  flex-shrink: 0;

  .chev {
    color: var(--color-accent-blue);
  }
  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--color-highlight-white);
    font-family: inherit;
    font-size: inherit;

    &::placeholder {
      color: var(--color-ash-dim);
    }
  }
  .kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 18px;
    min-width: 18px;
    padding: 0 4px;
    font-size: 10px;
    color: var(--color-ash-text);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 3px;
  }
}
</style>
