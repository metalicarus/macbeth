<script setup lang="ts">
import { createPlay } from '@macbeth/core';
import { useI18n } from 'vue-i18n';
import LookToggle from './components/LookToggle.vue';

const { t } = useI18n();
const play = createPlay();
</script>

<template>
  <div class="app">
    <header class="topbar">
      <span class="brand">Macbeth</span>
      <span class="file">{{ play.titlePage.title || t('app.untitled') }}</span>
      <span class="spacer"></span>
      <LookToggle />
    </header>
    <main class="desk"></main>
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

.spacer {
  flex: 1;
}

.desk {
  background: var(--desk);
  min-height: 0;
  overflow: auto;
}
</style>
