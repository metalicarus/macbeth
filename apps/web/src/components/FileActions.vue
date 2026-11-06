<script setup lang="ts">
import { MbthError } from '@macbeth/core';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';
import { computed, onBeforeUnmount, onMounted } from 'vue';
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

/** Com cortes na peça, o Exportar PDF oferece a versão do espetáculo e a cópia da direção. */
const hasCuts = computed(() =>
  store.play.acts.some((act) => act.scenes.some((scene) => scene.elements.some((e) => e.cuts?.length))),
);

const exportPdf = (cuts: 'omit' | 'strike' = 'omit') =>
  run(async () => {
    const labels = { continues: t('print.continues'), continued: t('print.continued') };
    const bytes = await playToPdf(store.play, await scriptFonts(), labels, cuts);
    const base = store.fileName?.replace(/\.mbth$/i, '') || store.play.titlePage.title || t('app.untitled');
    const name = cuts === 'strike' ? `${base} (${t('file.directorSuffix')})` : base;
    await fileProvider().save(bytes, null, suggestedFileName(name, PDF_FILE.extension), PDF_FILE);
  });

function onKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  const actions: Record<string, () => void> = {
    n: newPlay,
    o: open,
    i: importFile,
    s: () => save(event.shiftKey),
    p: () => exportPdf(event.shiftKey ? 'strike' : 'omit'),
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
    <DropdownMenuRoot v-if="hasCuts">
      <DropdownMenuTrigger as-child>
        <button type="button">{{ t('file.exportPdf') }} ▾</button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent class="export-menu" align="end" :side-offset="6">
          <DropdownMenuItem class="export-menu-item" @select="exportPdf('omit')">
            <span>{{ t('file.exportShow') }}</span>
            <small>{{ t('file.exportShowHint') }}</small>
          </DropdownMenuItem>
          <DropdownMenuItem class="export-menu-item" @select="exportPdf('strike')">
            <span>{{ t('file.exportDirector') }}</span>
            <small>{{ t('file.exportDirectorHint') }}</small>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
    <button v-else type="button" :title="`${t('file.exportPdf')} (Ctrl+P)`" @click="exportPdf()">
      {{ t('file.exportPdf') }}
    </button>
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
  white-space: nowrap;
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

<!-- O menu é desenhado fora do componente (portal), onde estilos com escopo não chegam. -->
<style>
.export-menu {
  z-index: 30;
  min-width: 240px;
  padding: 4px;
  background: var(--page);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 10px 30px -10px rgb(0 0 0 / 35%);
}

.export-menu-item {
  display: grid;
  gap: 2px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
  outline: none;
}

.export-menu-item[data-highlighted] {
  background: var(--accent-soft);
}

.export-menu-item small {
  font-size: 11.5px;
  color: var(--muted);
}
</style>
