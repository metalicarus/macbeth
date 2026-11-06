<script setup lang="ts">
import { listNotes, type Id } from '@macbeth/core';
import { computed, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { addNote, removeNote, updateNote } from '../editor/notes';
import { useEditorBridge } from '../stores/editor';
import { useNavigation } from '../stores/navigation';
import { useNotice } from '../stores/notice';
import { usePlayStore } from '../stores/play';

const { t } = useI18n();
const store = usePlayStore();
const bridge = useEditorBridge();
const navigation = useNavigation();
const notice = useNotice();

const entries = computed(() => listNotes(store.play));

function create() {
  const editor = bridge.editor;
  if (!editor) return;
  const note = addNote(editor.state, editor.view.dispatch);
  if (note) bridge.focusedNote = note.id;
  else notice.show(t('notes.needsElement'));
}

function edit(elementId: Id, noteId: Id, patch: { text?: string; resolved?: boolean }) {
  const editor = bridge.editor;
  if (editor) updateNote(editor.state, editor.view.dispatch, elementId, noteId, patch);
}

function remove(elementId: Id, noteId: Id) {
  const editor = bridge.editor;
  if (editor) removeNote(editor.state, editor.view.dispatch, elementId, noteId);
}

// Nota recém-criada ou cujo alfinete foi clicado: rola até ela e põe o cursor no texto.
watch(
  () => bridge.focusedNote,
  async (id) => {
    if (!id) return;
    await nextTick();
    const field = document.querySelector<HTMLTextAreaElement>(`textarea[data-note="${id}"]`);
    field?.scrollIntoView({ block: 'nearest' });
    field?.focus();
    bridge.focusedNote = null;
  },
  { immediate: true },
);
</script>

<template>
  <section class="notes">
    <div class="head">
      <h4>{{ t('notes.title') }}</h4>
      <button type="button" class="add" :title="t('notes.addHint')" @mousedown.prevent @click="create">
        {{ t('notes.add') }}
      </button>
    </div>
    <p v-if="entries.length === 0" class="hint">{{ t('notes.empty') }}</p>

    <ul>
      <li v-for="entry in entries" :key="entry.note.id" :class="{ resolved: entry.note.resolved }">
        <button
          type="button"
          class="excerpt"
          :aria-label="t('notes.goTo', { number: entry.number })"
          @click="navigation.goTo(entry.elementId)"
        >
          <span class="number">{{ entry.number }}</span>
          <span class="text">{{ entry.excerpt }}</span>
        </button>
        <textarea
          :data-note="entry.note.id"
          :value="entry.note.text"
          :placeholder="t('notes.placeholder')"
          rows="2"
          @input="edit(entry.elementId, entry.note.id, { text: ($event.target as HTMLTextAreaElement).value })"
        ></textarea>
        <div class="actions">
          <label>
            <input
              type="checkbox"
              :checked="entry.note.resolved ?? false"
              @change="edit(entry.elementId, entry.note.id, { resolved: ($event.target as HTMLInputElement).checked })"
            />
            {{ t('notes.resolved') }}
          </label>
          <button
            type="button"
            class="remove"
            :aria-label="t('notes.remove', { number: entry.number })"
            :title="t('notes.remove', { number: entry.number })"
            @click="remove(entry.elementId, entry.note.id)"
          >
            ×
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.notes {
  display: grid;
  gap: 10px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h4 {
  margin: 0;
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.add {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink);
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

li {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--note);
  color: var(--note-ink);
}

li.resolved {
  opacity: 0.6;
}

.excerpt {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  text-align: left;
  font-size: 11.5px;
}

.number {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--note-ink) 35%, transparent);
  font: 700 10.5px/1 var(--font-label);
}

.excerpt .text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-script);
  opacity: 0.85;
}

.excerpt:hover .text {
  text-decoration: underline;
}

textarea {
  font: 400 12.5px/1.45 var(--font-ui);
  color: inherit;
  background: color-mix(in srgb, var(--page) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--note-ink) 20%, transparent);
  border-radius: 6px;
  padding: 6px 8px;
  resize: vertical;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.actions label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.remove {
  font-size: 15px;
  line-height: 1;
  color: inherit;
  opacity: 0.7;
}

.remove:hover {
  opacity: 1;
  color: var(--cut);
}
</style>
