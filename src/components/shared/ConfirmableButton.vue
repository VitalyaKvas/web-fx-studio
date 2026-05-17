<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  label?: string
  confirmLabel?: string
  ariaLabel?: string
  resetMs?: number
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  confirmLabel: 'Confirm',
  ariaLabel: '',
  resetMs: 1800,
})

const emit = defineEmits<{
  confirmed: []
}>()

const armed = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | null = null

function onClick(): void {
  if (!armed.value) {
    armed.value = true
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      armed.value = false
    }, props.resetMs)
    return
  }
  if (resetTimer) clearTimeout(resetTimer)
  armed.value = false
  emit('confirmed')
}
</script>

<template>
  <button
    type="button"
    class="confirmable"
    :data-armed="armed"
    :aria-label="ariaLabel || label"
    @click.stop="onClick"
  >
    <slot v-if="!armed" />
    <span v-else class="confirm-text">{{ confirmLabel }}</span>
  </button>
</template>

<style lang="scss" scoped>
.confirmable {
  background: transparent;
  border: none;
  padding: 2px 4px;
  border-radius: 3px;
  color: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &[data-armed='true'] {
    background: rgba(255, 80, 96, 0.18);
    color: var(--color-error-red);
  }
  .confirm-text {
    font-family: var(--font-geist-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
}
</style>
