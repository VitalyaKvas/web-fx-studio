<script setup lang="ts">
interface Props {
  title: string
  accentDot?: boolean
}
withDefaults(defineProps<Props>(), { accentDot: false })
</script>

<template>
  <div class="pane-header">
    <div class="pane-title">
      <span v-if="accentDot" class="dot" aria-hidden="true">●</span>
      <slot name="lead" />
      <span>{{ title }}</span>
    </div>
    <div class="pane-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
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
    line-height: 1;
  }
}
.pane-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
