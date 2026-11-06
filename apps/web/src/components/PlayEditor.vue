<script setup lang="ts">
import { suggestCharacters } from '@macbeth/core';
import { Placeholder } from '@tiptap/extensions/placeholder';
import { UndoRedo } from '@tiptap/extensions/undo-redo';
import { EditorState } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { playToDoc } from '../editor/convert';
import { CueSuggest, type CueSuggestState } from '../editor/cue-suggest';
import { CutCommand, toggleCut } from '../editor/cut';
import { PlayKeymap } from '../editor/keymap';
import { elementIdAt, goToElement } from '../editor/navigate';
import { addNote, NotePins } from '../editor/notes';
import { renameCues } from '../editor/rename';
import { playExtensions } from '../editor/schema';
import { UniqueIds } from '../editor/unique-ids';
import { useEditorBridge } from '../stores/editor';
import { useNavigation } from '../stores/navigation';
import { usePlayStore } from '../stores/play';
import { usePreferences } from '../stores/preferences';
import CueSuggestList from './CueSuggestList.vue';

const { t } = useI18n();
const store = usePlayStore();
const navigation = useNavigation();
const preferences = usePreferences();
const bridge = useEditorBridge();
const page = ref<HTMLElement>();
const suggestion = shallowRef<CueSuggestState>({ open: false, items: [], index: 0, from: 0 });

const PLACEHOLDER_KEYS: Record<string, string> = {
  act: 'act',
  scene: 'scene',
  direction: 'direction',
  speechCue: 'cue',
  speechParenthetical: 'parenthetical',
  speechLine: 'line',
};

/** Abre o painel na nota indicada (alfinete clicado ou nota recém-criada). */
function showNote(id: string) {
  preferences.panelOpen = true;
  bridge.focusedNote = id;
}

// Ctrl+Alt+M: nova nota na fala ou rubrica onde está o cursor.
const NoteShortcut = Extension.create({
  name: 'noteShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-m': () => {
        const note = addNote(this.editor.state, this.editor.view.dispatch);
        if (note) showNote(note.id);
        return true;
      },
    };
  },
});

const editor = useEditor({
  extensions: [
    ...playExtensions,
    UndoRedo,
    UniqueIds,
    PlayKeymap,
    CutCommand,
    NotePins.configure({ onOpen: showNote }),
    NoteShortcut,
    CueSuggest.configure({
      suggest: (query) => suggestCharacters(store.play, query),
      onChange: (state) => (suggestion.value = state),
    }),
    // Além de orientar quem escreve, o texto de exemplo dá largura às partes
    // vazias da fala; sem isso o navegador não consegue pôr o cursor nelas.
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: false,
      // Só a chave: o texto vem das variáveis CSS da página (placeholderVars),
      // que acompanham a língua da interface sem precisar recalcular o editor.
      placeholder: ({ node }) => PLACEHOLDER_KEYS[node.type.name] ?? '',
    }),
  ],
  content: playToDoc(store.play),
  editorProps: {
    attributes: { class: 'script', spellcheck: 'true', lang: 'pt-BR' },
  },
  onCreate: ({ editor }) => (bridge.editor = editor),
  onUpdate: ({ editor }) => {
    store.applyDoc(editor.getJSON());
    navigation.cursorElementId = elementIdAt(editor.state);
  },
  onSelectionUpdate: ({ editor }) => (navigation.cursorElementId = elementIdAt(editor.state)),
});

// Pedido de navegação vindo da lateral ou da tabela de cenas. Vindo da tabela,
// o texto acabou de reaparecer: espera um quadro para a tela se recompor, senão
// a rolagem e o foco se perdem.
watch(
  () => navigation.request,
  (request) => {
    if (!request) return;
    requestAnimationFrame(() => {
      if (editor.value) goToElement(editor.value, request.id);
    });
  },
  { flush: 'post' },
);

// Outra peça foi aberta (ou uma nova criada): o editor passa a mostrá-la, com o
// histórico zerado, para que Ctrl+Z não tente desfazer edições da peça anterior.
watch(
  () => store.revision,
  () => {
    const ed = editor.value;
    if (!ed) return;
    const doc = ed.schema.nodeFromJSON(playToDoc(store.play));
    ed.view.updateState(EditorState.create({ doc, plugins: ed.state.plugins }));
  },
);

// Personagem renomeado no painel: o nome muda em todas as falas dele no texto.
let names = new Map(store.play.characters.map((c) => [c.id, c.name]));
watch(
  () => store.play.characters,
  (characters) => {
    const previous = names;
    names = new Map(characters.map((c) => [c.id, c.name]));
    const ed = editor.value;
    if (!ed) return;
    for (const c of characters) {
      const old = previous.get(c.id);
      if (old !== undefined && old !== c.name) renameCues(ed.state, ed.view.dispatch, c.id, old, c.name);
    }
  },
);

/** Textos de exemplo na língua da interface, como variáveis CSS (`--ph-cue`, `--ph-line`…). */
const placeholderVars = computed(() =>
  Object.fromEntries(
    Object.values(PLACEHOLDER_KEYS).map((key) => [`--ph-${key}`, JSON.stringify(t(`editor.placeholder.${key}`))]),
  ),
);

function cut() {
  const ed = editor.value;
  if (!ed) return;
  toggleCut(ed.state, ed.view.dispatch);
  ed.view.focus();
}

onBeforeUnmount(() => {
  bridge.editor = null;
  editor.value?.destroy();
});
</script>

<template>
  <div class="toolbar">
    <!-- mousedown.prevent mantém a seleção do texto ao clicar no botão. -->
    <button type="button" :title="t('editor.toolbar.cutHint')" @mousedown.prevent @click="cut">
      {{ t('editor.toolbar.cut') }} <kbd>Ctrl+Shift+X</kbd>
    </button>
    <label><input v-model="preferences.showCuts" type="checkbox" /> {{ t('editor.toolbar.showCuts') }}</label>
  </div>
  <div
    ref="page"
    class="page fmt-inline"
    :class="{ 'hide-cuts': !preferences.showCuts }"
    :style="placeholderVars"
  >
    <EditorContent :editor="editor" />
    <CueSuggestList v-if="editor && page && suggestion.open" :editor="editor" :state="suggestion" :container="page" />
  </div>
</template>

<style scoped>
.toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 640px;
  margin: 0 auto;
  padding: 8px 2px;
  background: var(--desk);
  font-size: 12px;
  color: var(--muted);
}

.toolbar button {
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--page);
  color: var(--ink);
}

.toolbar kbd {
  font: 500 10px/1 var(--font-label);
  color: var(--muted);
  margin-left: 4px;
}

.toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar input {
  accent-color: var(--accent);
}

.page {
  position: relative;
  background: var(--page);
  max-width: 640px;
  min-height: 900px;
  margin: 6px auto 60px;
  padding: 56px 64px 72px;
  box-shadow:
    0 1px 3px rgb(0 0 0 / 12%),
    0 12px 32px -16px rgb(0 0 0 / 25%);
  font: 400 14.5px/1.55 var(--font-script);
  color: var(--ink);
}

/* Corte da direção: o texto continua, riscado em vermelho; pode sumir da tela. */
.page :deep(.cut) {
  color: var(--cut);
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
}

.page.hide-cuts :deep(.cut),
.page.hide-cuts :deep(.fully-cut) {
  display: none;
}

/* Fala cortada inteira: o nome e o parentético também aparecem riscados. */
.page :deep(.fully-cut .speech-cue),
.page :deep(.fully-cut .speech-parenthetical),
.page :deep(.el-direction.fully-cut) {
  color: var(--cut);
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
}

/* Alfinete de nota na margem, à esquerda do elemento. */
.page :deep(.el) {
  position: relative;
}

.page :deep(.notepin) {
  position: absolute;
  left: -46px;
  top: 0;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: 11px;
  background: var(--note);
  color: var(--note-ink);
  border: 1px solid color-mix(in srgb, var(--note-ink) 30%, transparent);
  font: 700 10.5px/20px var(--font-label);
  font-style: normal;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
}

.page :deep(.notepin.resolved) {
  opacity: 0.45;
}

.page :deep(.script) {
  outline: none;
  min-height: 100%;
}

.page :deep(.el) {
  margin: 0 0 14px;
  font: inherit;
}

.page :deep(.el-act) {
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.page :deep(.el-scene) {
  text-align: center;
  font-weight: 700;
  margin-bottom: 18px;
}

.page :deep(.el-direction) {
  font-style: italic;
}

.page :deep(.speech-cue) {
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.page :deep(.speech-parenthetical) {
  font-style: italic;
}

/*
 * Em linha: o padrão das edições brasileiras.
 *   MACBETH – (baixo) Dia tão feio e tão belo eu nunca vi.
 *   (Trovão. Entram as Bruxas.)
 *
 * O personagem e o parentético flutuam à esquerda e o texto da fala é um
 * bloco comum: a primeira linha contorna o nome e as seguintes voltam para a
 * margem. Não dá para usar partes "inline": numa parte inline vazia o
 * navegador joga o cursor de volta para o fim do nome.
 */
.fmt-inline :deep(.el-direction)::before {
  content: '(';
}

.fmt-inline :deep(.el-direction)::after {
  content: ')';
}

.fmt-inline :deep(.speech-cue),
.fmt-inline :deep(.speech-parenthetical) {
  float: left;
  position: relative;
  margin-right: 1ch;
}

.fmt-inline :deep(.speech-cue)::after {
  content: '\00a0–';
  font-weight: 400;
}

.fmt-inline :deep(.speech-parenthetical)::before {
  content: '(';
}

.fmt-inline :deep(.speech-parenthetical)::after {
  content: ')';
}

.fmt-inline :deep(.speech-line) {
  display: block;
}

.fmt-inline :deep(.el-speech)::after {
  content: '';
  display: block;
  clear: both;
}

/* Elementos vazios mostram o texto de exemplo, sem ocupar o lugar do cursor. */
.page :deep(.is-empty)::before {
  color: var(--muted);
  font-weight: 400;
  font-style: normal;
  pointer-events: none;
}

.page :deep(.el-act.is-empty)::before,
.page :deep(.el-scene.is-empty)::before {
  display: block;
  height: 0;
}

.page :deep(.el-act.is-empty)::before {
  content: var(--ph-act);
}

.page :deep(.el-scene.is-empty)::before {
  content: var(--ph-scene);
}

.fmt-inline :deep(.el-direction.is-empty)::before {
  content: '(' var(--ph-direction) ')';
  float: left;
  height: 0;
}

.fmt-inline :deep(.el-direction.is-empty)::after,
.fmt-inline :deep(.speech-cue.is-empty)::after,
.fmt-inline :deep(.speech-parenthetical.is-empty)::after {
  content: none;
}

/* Nome e parentético vazios ganham a largura do texto de exemplo. */
.fmt-inline :deep(.speech-cue.is-empty) {
  min-width: 11ch;
}

.fmt-inline :deep(.speech-parenthetical.is-empty) {
  min-width: 14ch;
}

.fmt-inline :deep(.speech-cue.is-empty)::before,
.fmt-inline :deep(.speech-parenthetical.is-empty)::before {
  content: var(--ph-cue);
  position: absolute;
  left: 0;
  white-space: nowrap;
}

.fmt-inline :deep(.speech-parenthetical.is-empty)::before {
  content: '(' var(--ph-parenthetical) ')';
}

.fmt-inline :deep(.speech-line.is-empty)::before {
  content: var(--ph-line);
  float: left;
  height: 0;
}
</style>
