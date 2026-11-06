<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { redrawSpellCheck } from '../editor/spellcheck';
import { spellClient } from '../spell/client';
import { useEditorBridge } from '../stores/editor';
import { usePlayStore } from '../stores/play';

/** Palavra sublinhada clicada com o botão direito: onde está no texto e onde abrir o menu. */
export interface SpellTarget {
  word: string;
  from: number;
  to: number;
  x: number;
  y: number;
}

const props = defineProps<{ editor: Editor; target: SpellTarget }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const store = usePlayStore();
const bridge = useEditorBridge();

const menu = ref<HTMLElement>();
const suggestions = ref<string[] | null>(null);

// Perto da borda da janela, o menu abre para o lado de dentro.
const position = computed(() => ({
  left: `${Math.min(props.target.x, window.innerWidth - 260)}px`,
  top: `${Math.min(props.target.y, window.innerHeight - 240)}px`,
}));

function close(refocus = true) {
  emit('close');
  if (refocus) props.editor.view.focus();
}

function replace(suggestion: string) {
  const { view } = props.editor;
  view.dispatch(view.state.tr.insertText(suggestion, props.target.from, props.target.to));
  close();
}

function addToDictionary() {
  store.addDictionaryWord(props.target.word);
  close();
}

function ignore() {
  bridge.ignoredWords.add(props.target.word.toLocaleLowerCase());
  redrawSpellCheck(props.editor.view);
  close();
}

/** Setas andam entre as opções; Esc fecha. */
function onKeydown(event: KeyboardEvent) {
  const items = [...(menu.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  }
}

function onPointerDown(event: PointerEvent) {
  if (!menu.value?.contains(event.target as Node)) close(false);
}

onMounted(async () => {
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('blur', () => close(false), { once: true });
  suggestions.value = await spellClient.suggest(props.target.word);
  await nextTick();
  menu.value?.querySelector<HTMLButtonElement>('button')?.focus();
});

onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown, true));
</script>

<template>
  <div ref="menu" class="spell-menu" role="menu" :aria-label="t('spell.menu')" :style="position" @keydown="onKeydown">
    <p v-if="suggestions === null" class="info">{{ t('spell.loading') }}</p>
    <p v-else-if="suggestions.length === 0" class="info">{{ t('spell.noSuggestions') }}</p>
    <button v-for="suggestion in suggestions" :key="suggestion" type="button" role="menuitem" class="suggestion" @click="replace(suggestion)">
      {{ suggestion }}
    </button>
    <hr />
    <button type="button" role="menuitem" @click="addToDictionary">{{ t('spell.add') }}</button>
    <button type="button" role="menuitem" @click="ignore">{{ t('spell.ignore') }}</button>
  </div>
</template>

<style scoped>
.spell-menu {
  position: fixed;
  z-index: 30;
  min-width: 220px;
  max-width: 260px;
  padding: 4px;
  display: grid;
  background: var(--page);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 10px 30px -10px rgb(0 0 0 / 35%);
  font: 400 12.5px/1.3 var(--font-ui);
}

button {
  text-align: left;
  padding: 7px 10px;
  border-radius: 6px;
  color: var(--ink);
}

button:hover,
button:focus-visible {
  background: var(--accent-soft);
  outline: none;
}

.suggestion {
  font-weight: 600;
}

.info {
  margin: 0;
  padding: 7px 10px;
  color: var(--muted);
}

hr {
  margin: 4px 6px;
  border: 0;
  border-top: 1px solid var(--line);
}
</style>
