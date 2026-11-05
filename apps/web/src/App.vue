<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import FileActions from './components/FileActions.vue';
import LookToggle from './components/LookToggle.vue';
import PlayEditor from './components/PlayEditor.vue';
import PlayPanel from './components/PlayPanel.vue';
import { guardUnsavedClose } from './files/close-guard';
import { usePlayStore } from './stores/play';
import { usePreferences } from './stores/preferences';

const { t } = useI18n();
const { play, fileName, dirty } = storeToRefs(usePlayStore());
const { panelOpen } = storeToRefs(usePreferences());

onMounted(() =>
  guardUnsavedClose(
    () => dirty.value,
    () => t('file.confirmClose'),
  ),
);
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
      <FileActions />
      <LookToggle />
      <button type="button" class="panel-toggle" :aria-pressed="panelOpen" @click="panelOpen = !panelOpen">
        {{ t('panel.toggle') }}
      </button>
    </header>
    <div class="body" :class="{ 'with-panel': panelOpen }">
      <main class="desk">
        <PlayEditor />
      </main>
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

.body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 0;
}

.body.with-panel {
  grid-template-columns: minmax(0, 1fr) 280px;
}

.desk {
  background: var(--desk);
  min-height: 0;
  overflow: auto;
  padding: 0 24px;
}
</style>
