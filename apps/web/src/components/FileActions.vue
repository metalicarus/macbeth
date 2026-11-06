<script setup lang="ts">
import { MbthError } from '@macbeth/core';
import { onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { fileProvider, PDF_FILE, suggestedFileName } from '../files';
import { alertDialog, confirmDialog } from '../files/dialogs';
import { ImportError } from '../import';
import { scriptFonts } from '../print/fonts';
import { playToPdf } from '../print/pdf';
import { useNotice } from '../stores/notice';
import { usePlayStore } from '../stores/play';

const { t } = useI18n();
const store = usePlayStore();
const notice = useNotice();

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
        : error instanceof ImportError
          ? t(`import.errors.${error.code}`)
          : t('file.errors.generic', { detail: error instanceof Error ? error.message : String(error) });
    await alertDialog(text);
  }
}

const newPlay = () => run(async () => (await discardChanges()) && store.newPlay());
const open = () => run(async () => (await discardChanges()) && store.open());
const save = (as = false) => run(() => store.save(t('app.untitled'), as));

const importFile = () =>
  run(async () => {
    if (!(await discardChanges())) return;
    const summary = await store.importFrom();
    if (!summary) return;
    notice.show(
      t('import.summary', {
        acts: t('import.acts', summary.acts),
        scenes: t('import.scenes', summary.scenes),
        characters: t('import.characters', summary.characters),
        speeches: t('import.speeches', summary.speeches),
      }),
    );
  });

const exportPdf = () =>
  run(async () => {
    const bytes = await playToPdf(store.play, await scriptFonts(), {
      continues: t('print.continues'),
      continued: t('print.continued'),
    });
    const base = store.fileName?.replace(/\.mbth$/i, '') || store.play.titlePage.title || t('app.untitled');
    await fileProvider().save(bytes, null, suggestedFileName(base, PDF_FILE.extension), PDF_FILE);
  });

function onKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  const actions: Record<string, () => void> = {
    n: newPlay,
    o: open,
    i: importFile,
    s: () => save(event.shiftKey),
    p: exportPdf,
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
    <button type="button" :title="`${t('import.button')} .docx, .odt, Fountain (Ctrl+I)`" @click="importFile">
      {{ t('import.button') }}
    </button>
    <button type="button" :title="`${t('file.exportPdf')} (Ctrl+P)`" @click="exportPdf">{{ t('file.exportPdf') }}</button>
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
