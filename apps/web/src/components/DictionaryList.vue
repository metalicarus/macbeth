<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlayStore } from '../stores/play';

const { t } = useI18n();
const store = usePlayStore();

const words = computed(() => store.play.dictionary ?? []);
const newWords = ref('');

/** Aceita várias de uma vez ("Glamis, Cawdor"): o corretor confere palavra por palavra. */
function add() {
  for (const word of newWords.value.split(/[\s,;]+/)) store.addDictionaryWord(word);
  newWords.value = '';
}
</script>

<template>
  <details class="dictionary">
    <summary>
      <h4>{{ t('dictionary.title') }}</h4>
      <small>{{ words.length }}</small>
    </summary>
    <p class="hint">{{ t('dictionary.hint') }}</p>

    <ul v-if="words.length">
      <li v-for="word in words" :key="word">
        <span>{{ word }}</span>
        <button
          type="button"
          class="remove"
          :aria-label="t('dictionary.remove', { word })"
          :title="t('dictionary.remove', { word })"
          @click="store.removeDictionaryWord(word)"
        >
          ×
        </button>
      </li>
    </ul>
    <p v-else class="hint">{{ t('dictionary.empty') }}</p>

    <form class="add" @submit.prevent="add">
      <input v-model="newWords" type="text" :placeholder="t('dictionary.addPlaceholder')" :aria-label="t('dictionary.add')" />
      <button type="submit">{{ t('dictionary.add') }}</button>
    </form>
  </details>
</template>

<style scoped>
/* Sem grid no <details>: o WebKit do desktop não o aceita. */
.dictionary[open] > summary {
  margin-bottom: 10px;
}

summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

summary::before {
  content: '▸';
  font-size: 10px;
  color: var(--muted);
}

.dictionary[open] > summary::before {
  content: '▾';
}

h4 {
  margin: 0;
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

summary small {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--muted);
}

ul {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

li {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--page);
  font-size: 12px;
}

.remove {
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  padding: 0 3px;
}

.remove:hover {
  color: var(--cut);
}

.add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
}

.add input {
  font: inherit;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--page);
  color: var(--ink);
}

.add input::placeholder {
  color: var(--muted);
  opacity: 0.7;
}

.add button {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink);
}
</style>
