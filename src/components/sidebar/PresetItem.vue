<script setup lang="ts">
import { computed } from 'vue'
import type { Preset } from '@/types'
import { PRESET_TYPE_LABEL } from '@/types'
import Icon from '@/components/shared/Icon.vue'
import ConfirmableButton from '@/components/shared/ConfirmableButton.vue'

interface Props {
  preset: Preset
  active: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
}>()

const techLabel = computed(() => PRESET_TYPE_LABEL[props.preset.type])
const anyDirty = computed(() => Object.values(props.preset.files).some((f) => f.isDirty))

function onSelect(): void {
  emit('select', props.preset.id)
}
function onDelete(): void {
  emit('delete', props.preset.id)
}
</script>

<template>
  <div
    :class="['preset', { active }]"
    role="option"
    :aria-selected="active"
    tabindex="0"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <span class="preset-tech">{{ techLabel }}</span>
    <span class="preset-name">{{ preset.name }}</span>
    <span v-if="anyDirty" class="dirty" aria-label="modified">●</span>
    <ConfirmableButton
      v-if="preset.isCustom"
      class="trash"
      :aria-label="`Delete preset ${preset.name}`"
      confirm-label="Sure?"
      @confirmed="onDelete"
    >
      <Icon name="trash" :size="12" />
    </ConfirmableButton>
  </div>
</template>

<style lang="scss" scoped>
.preset {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-subtle-cream);
  cursor: pointer;
  user-select: none;
  position: relative;
  border: 1px solid transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.035);
  }
  &.active {
    background: rgba(33, 126, 255, 0.1);
    border-color: rgba(33, 126, 255, 0.25);

    .preset-tech {
      color: var(--color-accent-blue);
    }
    .preset-name {
      color: var(--color-highlight-white);
    }
  }

  .preset-tech {
    font-family: var(--font-geist-mono);
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--color-ash-text);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    padding: 2px 5px;
    min-width: 50px;
    text-align: center;
    flex-shrink: 0;
  }
  .preset-name {
    color: var(--color-subtle-cream);
    font-size: 13px;
    flex: 1;
    @include truncate;
    letter-spacing: -0.01em;
  }
  .dirty {
    color: var(--color-accent-blue);
    font-family: var(--font-geist-mono);
    font-size: 12px;
    line-height: 1;
  }
  :deep(.trash) {
    opacity: 0;
    transition: opacity 120ms;
    color: var(--color-ash-dim);
  }
  &:hover :deep(.trash),
  :deep(.trash[data-armed='true']) {
    opacity: 1;
  }
  :deep(.trash:hover) {
    color: var(--color-error-red);
    background: rgba(255, 80, 96, 0.08);
  }

  @include breakpoint-mobile {
    flex-shrink: 0;
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-midnight-base);

    .preset-name {
      font-size: 12px;
    }
    :deep(.trash) {
      display: none;
    }
  }
}
</style>
