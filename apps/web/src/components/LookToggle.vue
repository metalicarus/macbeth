<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import { usePreferences } from '../stores/preferences';

const { t } = useI18n();
const { look } = storeToRefs(usePreferences());

// No modo "single", clicar no item ativo o desmarca; aqui um visual fica sempre escolhido.
function choose(value: unknown) {
  if (value === 'papel' || value === 'coxia') look.value = value;
}
</script>

<template>
  <ToggleGroupRoot
    class="seg"
    type="single"
    :model-value="look"
    :aria-label="t('look.label')"
    @update:model-value="choose"
  >
    <ToggleGroupItem class="seg-item" value="papel">{{ t('look.papel') }}</ToggleGroupItem>
    <ToggleGroupItem class="seg-item" value="coxia">{{ t('look.coxia') }}</ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<style scoped>
.seg {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 7px;
  overflow: hidden;
}

.seg-item {
  padding: 5px 10px;
  font-size: 12px;
  color: var(--muted);
}

.seg-item[data-state='on'] {
  background: var(--accent);
  color: var(--accent-ink);
}
</style>
