<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import FileActions from './components/FileActions.vue';
import LookToggle from './components/LookToggle.vue';
import ModeTabs from './components/ModeTabs.vue';
import NoticeBar from './components/NoticeBar.vue';
import OutlinePane from './components/OutlinePane.vue';
import PlayEditor from './components/PlayEditor.vue';
import PlayPanel from './components/PlayPanel.vue';
import ShortcutsDialog from './components/ShortcutsDialog.vue';
import StructureView from './components/StructureView.vue';
import { guardUnsavedClose } from './files/close-guard';
import { useNavigation } from './stores/navigation';
import { usePlayStore } from './stores/play';
import { usePreferences } from './stores/preferences';

const { t } = useI18n();
const { play, fileName, dirty } = storeToRefs(usePlayStore());
const { panelOpen, outlineOpen } = storeToRefs(usePreferences());
const { mode } = storeToRefs(useNavigation());

// O Sumário só faz sentido junto do texto; na Estrutura a tabela ocupa o lugar.
const showOutline = computed(() => outlineOpen.value && mode.value === 'write');
const columns = computed(() =>
  [showOutline.value ? '220px' : '', 'minmax(0, 1fr)', panelOpen.value ? '280px' : ''].filter(Boolean).join(' '),
);

onMounted(() =>
  guardUnsavedClose(
    () => dirty.value,
    () => t('file.confirmClose'),
  ),
);

// Mapa de atalhos: botão "?", Ctrl+/ ou F1.
const shortcutsOpen = ref(false);

function onKeydown(event: KeyboardEvent) {
  const isHelp = event.key === 'F1' || ((event.ctrlKey || event.metaKey) && event.key === '/');
  if (!isHelp) return;
  event.preventDefault();
  shortcutsOpen.value = !shortcutsOpen.value;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="app">
    <header class="topbar">
      <span class="brand">Macbeth</span>
      <span class="file">
        {{ fileName ?? (play.titlePage.title || t('app.untitled')) }}
        <span v-if="fileName || dirty" class="status" :class="{ dirty }">● {{ dirty ? t('file.unsaved') : t('file.saved') }}</span>
      </span>
      <span class="spacer"></span>
      <ModeTabs />
      <span class="spacer"></span>
      <FileActions />
      <LookToggle />
      <button type="button" class="panel-toggle" :aria-pressed="outlineOpen" @click="outlineOpen = !outlineOpen">
        {{ t('outline.toggle') }}
      </button>
      <button type="button" class="panel-toggle" :aria-pressed="panelOpen" @click="panelOpen = !panelOpen">
        {{ t('panel.toggle') }}
      </button>
      <button
        type="button"
        class="help"
        :aria-label="t('shortcuts.open')"
        :title="`${t('shortcuts.open')} (Ctrl+/)`"
        @click="shortcutsOpen = true"
      >
        ?
      </button>
    </header>
    <ShortcutsDialog v-model:open="shortcutsOpen" />
    <div class="body" :style="{ gridTemplateColumns: columns }">
      <NoticeBar />
      <OutlinePane v-if="showOutline" />
      <div class="center">
        <!-- O editor fica montado na Estrutura, para preservar cursor e histórico. -->
        <main v-show="mode === 'write'" class="desk">
          <PlayEditor />
        </main>
        <StructureView v-if="mode === 'structure'" />
      </div>
      <PlayPanel v-if="panelOpen" />
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  min-width: 0;
}

/* Quando falta espaço, só o nome do arquivo encolhe. */
.topbar > * {
  flex-shrink: 0;
}

.topbar > .file {
  flex-shrink: 1;
}

.brand {
  font: 400 17px/1 var(--font-display);
}

/* O asterisco da marca: "a peça escocesa". */
.brand::after {
  content: '*';
  color: var(--accent);
}

.file {
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.status {
  margin-left: 6px;
  color: #2e9e5b;
}

.status.dirty {
  color: var(--muted);
}

.spacer {
  flex: 1;
}

.panel-toggle {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--muted);
}

.panel-toggle[aria-pressed='true'] {
  background: var(--accent-soft);
  color: var(--ink);
}

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

.body {
  position: relative;
  display: grid;
  min-height: 0;
}

.center {
  display: grid;
  min-height: 0;
  min-width: 0;
}

.desk {
  background: var(--desk);
  min-height: 0;
  overflow: auto;
  padding: 0 24px;
}
</style>
