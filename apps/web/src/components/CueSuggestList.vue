<script setup lang="ts">
import { countSpeeches } from '@macbeth/core';
import type { Editor } from '@tiptap/core';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { acceptCueSuggestion, type CueSuggestState } from '../editor/cue-suggest';
import { usePlayStore } from '../stores/play';

const props = defineProps<{
  editor: Editor;
  state: CueSuggestState;
  /** Elemento em relação ao qual a lista é posicionada. */
  container: HTMLElement;
}>();

const { t } = useI18n();
const store = usePlayStore();
const counts = computed(() => countSpeeches(store.play));

const position = computed(() => {
  const coords = props.editor.view.coordsAtPos(props.state.from);
  const box = props.container.getBoundingClientRect();
  return { top: `${coords.bottom - box.top + 4}px`, left: `${coords.left - box.left}px` };
});
</script>

<template>
  <ul class="suggest" role="listbox" :aria-label="t('editor.suggest.label')" :style="position">
    <!-- mousedown.prevent mantém o foco no editor. -->
    <li
      v-for="(character, i) in state.items"
      :key="character.id"
      role="option"
      :aria-selected="i === state.index"
      @mousedown.prevent="acceptCueSuggestion(editor, i)"
    >
      <i :style="{ background: character.color }"></i>
      <span>{{ character.name }}</span>
      <small>{{ t('editor.suggest.speeches', counts.get(character.id) ?? 0) }}</small>
    </li>
  </ul>
</template>

<style scoped>
.suggest {
  position: absolute;
  z-index: 3;
  margin: 0;
  padding: 4px;
  list-style: none;
  width: 260px;
  background: var(--page);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 10px 30px -10px rgb(0 0 0 / 35%);
  font: 400 12.5px/1.3 var(--font-ui);
}

li {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 5px;
  cursor: pointer;
}

li[aria-selected='true'] {
  background: var(--accent-soft);
}

i {
  width: 9px;
  height: 9px;
  border-radius: 2px;
}

small {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
</style>
