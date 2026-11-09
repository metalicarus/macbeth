<script setup lang="ts">
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import { keyLabel } from '../shortcuts';

const emit = defineEmits<{ shortcuts: []; about: [] }>();
const { t } = useI18n();
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button type="button" class="help" :aria-label="t('help.label')" :title="t('help.label')">?</button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="popup-menu" align="end" :side-offset="6">
        <DropdownMenuItem class="popup-menu-item" @select="emit('shortcuts')">
          <span>{{ t('shortcuts.open') }}</span>
          <small>{{ keyLabel('Mod') }}+/ · F1</small>
        </DropdownMenuItem>
        <DropdownMenuItem class="popup-menu-item" @select="emit('about')">
          <span>{{ t('about.open') }}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style scoped>
.help {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--line);
  font: 600 13px/1 var(--font-ui);
  color: var(--muted);
}

.help:hover {
  color: var(--ink);
}
</style>
