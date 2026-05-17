<script setup lang="ts">
interface Props {
  variant?: 'default' | 'accent' | 'danger'
}
withDefaults(defineProps<Props>(), { variant: 'default' })
</script>

<template>
  <span class="kbd" :data-variant="variant">
    <slot />
  </span>
</template>

<style lang="scss" scoped>
.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  min-width: 18px;
  padding: 0 4px;
  font-family: var(--font-geist-mono);
  font-size: 10px;
  color: var(--color-ash-text);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  letter-spacing: 0;

  &[data-variant='accent'] {
    color: #fff;
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.18);
  }

  &[data-variant='danger'] {
    color: var(--color-error-red);
    border-color: rgba(255, 80, 96, 0.3);
  }
}
</style>
