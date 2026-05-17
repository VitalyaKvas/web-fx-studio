<script setup lang="ts">
interface Props {
  tone?: 'neutral' | 'accent' | 'error' | 'success'
}
withDefaults(defineProps<Props>(), { tone: 'neutral' })
</script>

<template>
  <span class="pill" :data-tone="tone">
    <slot />
  </span>
</template>

<style lang="scss" scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-ash-text);
  font-family: var(--font-geist-mono);
  font-size: 11px;
  letter-spacing: 0;

  &[data-tone='accent'] {
    background: rgba(33, 126, 255, 0.12);
    color: var(--color-accent-blue);
  }
  &[data-tone='error'] {
    background: rgba(255, 81, 96, 0.12);
    color: var(--color-error-red);
  }
  &[data-tone='success'] {
    background: rgba(46, 204, 113, 0.12);
    color: var(--color-success-green);
  }
}
</style>
