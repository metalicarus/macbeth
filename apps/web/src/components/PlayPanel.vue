<script setup lang="ts">
import { PLAY_LANGUAGES, playLanguage, type TitlePage } from '@macbeth/core';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { dictionaryFor } from '../spell/dictionaries';
import { usePlayStore } from '../stores/play';
import CastList from './CastList.vue';
import NotesList from './NotesList.vue';

const { t, locale } = useI18n();
const store = usePlayStore();

/** Nome de cada língua na língua da interface ("Português (Brasil)", "Spanish"…), pelo próprio navegador. */
const languages = computed(() => {
  const names = new Intl.DisplayNames([locale.value], { type: 'language' });
  const label = (code: string) => {
    const name = names.of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(locale.value) + name.slice(1);
  };
  const current = playLanguage(store.play);
  // Um arquivo pode trazer uma língua fora da lista; ela aparece também.
  const codes = (PLAY_LANGUAGES as readonly string[]).includes(current) ? [...PLAY_LANGUAGES] : [...PLAY_LANGUAGES, current];
  return codes.map((code) => ({ code, label: label(code) }));
});

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
      <label class="field">
        <span>{{ t('panel.language') }}</span>
        <select
          :value="playLanguage(store.play)"
          @change="store.updateTitlePage({ language: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="language in languages" :key="language.code" :value="language.code">{{ language.label }}</option>
        </select>
      </label>
      <p v-if="!dictionaryFor(playLanguage(store.play))" class="hint warn">{{ t('panel.noSpellcheck') }}</p>
      <p class="hint">{{ t('panel.titlePageHint') }} {{ t('panel.languageHint') }}</p>
    </section>
    <NotesList />
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

input,
select {
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

.hint.warn {
  color: var(--cut);
}
</style>
