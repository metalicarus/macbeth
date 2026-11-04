<script setup lang="ts">
import { MbthError } from '@macbeth/core';
import { onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { alertDialog, confirmDialog } from '../files/dialogs';
import { usePlayStore } from '../stores/play';

const { t } = useI18n();
const store = usePlayStore();

async function discardChanges(): Promise<boolean> {
  return !store.dirty || confirmDialog(t('file.confirmDiscard'));
}

async function run(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    const text =
      error instanceof MbthError
        ? t(`file.errors.${error.code}`)
        : t('file.errors.generic', { detail: error instanceof Error ? error.message : String(error) });
    await alertDialog(text);
  }
}

const newPlay = () => run(async () => (await discardChanges()) && store.newPlay());
const open = () => run(async () => (await discardChanges()) && store.open());
const save = (as = false) => run(() => store.save(t('app.untitled'), as));

function onKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  const actions: Record<string, () => void> = {
    n: newPlay,
    o: open,
    s: () => save(event.shiftKey),
  };
  const action = actions[key];
  if (!action) return;
  event.preventDefault();
  action();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="actions">
    <button type="button" :title="`${t('file.new')} (Ctrl+N)`" @click="newPlay">{{ t('file.new') }}</button>
    <button type="button" :title="`${t('file.open')} (Ctrl+O)`" @click="open">{{ t('file.open') }}</button>
    <button
      type="button"
      class="primary"
      :title="`${t('file.save')} (Ctrl+S) · ${t('file.saveAs')} (Ctrl+Shift+S)`"
      @click="save()"
    >
      {{ t('file.save') }}
    </button>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  gap: 4px;
}

button {
  padding: 5px 10px;
  border-radius: 7px;
  font-size: 12px;
  color: var(--muted);
}

button:hover {
  color: var(--ink);
  background: var(--pane);
}

button.primary {
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}
</style>
