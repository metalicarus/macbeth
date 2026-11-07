<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import { useNavigation } from '../stores/navigation';

const { t } = useI18n();
const { mode } = storeToRefs(useNavigation());
</script>

<template>
  <TabsRoot v-model="mode" activation-mode="manual">
    <TabsList class="modes" :aria-label="t('modes.label')">
      <TabsTrigger class="mode" value="write">{{ t('modes.write') }}</TabsTrigger>
      <TabsTrigger class="mode" value="structure">{{ t('modes.structure') }}</TabsTrigger>
      <TabsTrigger class="mode" value="rehearse">{{ t('modes.rehearse') }}</TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>

<style scoped>
.modes {
  display: flex;
  gap: 2px;
  background: var(--pane);
  border: 1px solid var(--line);
  padding: 3px;
  border-radius: 8px;
}

.mode {
  padding: 5px 12px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.mode[data-state='active'] {
  background: var(--page);
  color: var(--ink);
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}
</style>
