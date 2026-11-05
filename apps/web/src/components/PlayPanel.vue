<script setup lang="ts">
import type { TitlePage } from '@macbeth/core';
import { useI18n } from 'vue-i18n';
import { usePlayStore } from '../stores/play';
import CastList from './CastList.vue';

const { t } = useI18n();
const store = usePlayStore();

const fields: { key: keyof TitlePage; label: string; placeholder: string }[] = [
  { key: 'title', label: 'panel.title', placeholder: 'panel.titlePlaceholder' },
  { key: 'subtitle', label: 'panel.subtitle', placeholder: 'panel.subtitlePlaceholder' },
  { key: 'author', label: 'panel.author', placeholder: 'panel.authorPlaceholder' },
];

function update(key: keyof TitlePage, event: Event) {
  store.updateTitlePage({ [key]: (event.target as HTMLInputElement).value });
}
</script>

<template>
  <aside class="panel">
    <section>
      <h4>{{ t('panel.titlePage') }}</h4>
      <label v-for="field in fields" :key="field.key" class="field">
        <span>{{ t(field.label) }}</span>
        <input
          type="text"
          :value="store.play.titlePage[field.key] ?? ''"
          :placeholder="t(field.placeholder)"
          @input="update(field.key, $event)"
        />
      </label>
      <p class="hint">{{ t('panel.titlePageHint') }}</p>
    </section>
    <CastList />
  </aside>
</template>

<style scoped>
.panel {
  background: var(--pane);
  border-left: 1px solid var(--line);
  overflow: auto;
  min-height: 0;
  padding: 14px 12px;
  display: grid;
  gap: 22px;
  align-content: start;
}

section {
  display: grid;
  gap: 10px;
}

h4 {
  margin: 0;
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.field {
  display: grid;
  gap: 4px;
}

.field span {
  font-size: 12px;
  color: var(--muted);
}

input {
  font: inherit;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--page);
  color: var(--ink);
}

input::placeholder {
  color: var(--muted);
  opacity: 0.7;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
</style>
