<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import FileActions from './components/FileActions.vue';
import LookToggle from './components/LookToggle.vue';
import PlayEditor from './components/PlayEditor.vue';
import { usePlayStore } from './stores/play';

const { t } = useI18n();
const { play, fileName, dirty } = storeToRefs(usePlayStore());
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
    </header>
    <main class="desk">
      <PlayEditor />
    </main>
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

.desk {
  background: var(--desk);
  min-height: 0;
  overflow: auto;
  padding: 0 24px;
}
</style>
