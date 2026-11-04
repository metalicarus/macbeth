<script setup lang="ts">
import { Placeholder } from '@tiptap/extensions/placeholder';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { playToDoc } from '../editor/convert';
import { PlayKeymap } from '../editor/keymap';
import { playExtensions } from '../editor/schema';
import { UniqueIds } from '../editor/unique-ids';
import { usePlayStore } from '../stores/play';

const { t } = useI18n();
const store = usePlayStore();

const PLACEHOLDER_KEYS: Record<string, string> = {
  act: 'act',
  scene: 'scene',
  direction: 'direction',
  speechCue: 'cue',
  speechParenthetical: 'parenthetical',
  speechLine: 'line',
};

const editor = useEditor({
  extensions: [
    ...playExtensions,
    UniqueIds,
    PlayKeymap,
    // Além de orientar quem escreve, o texto de exemplo dá largura às partes
    // vazias da fala; sem isso o navegador não consegue pôr o cursor nelas.
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: false,
      placeholder: ({ node }) => {
        const key = PLACEHOLDER_KEYS[node.type.name];
        return key ? t(`editor.placeholder.${key}`) : '';
      },
    }),
  ],
  content: playToDoc(store.play),
  editorProps: {
    attributes: { class: 'script', spellcheck: 'true', lang: 'pt-BR' },
  },
  onUpdate: ({ editor }) => store.applyDoc(editor.getJSON()),
});

onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
  <div class="page fmt-inline">
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
.page {
  background: var(--page);
  max-width: 640px;
  min-height: 900px;
  margin: 28px auto 60px;
  padding: 56px 64px 72px;
  box-shadow:
    0 1px 3px rgb(0 0 0 / 12%),
    0 12px 32px -16px rgb(0 0 0 / 25%);
  font: 400 14.5px/1.55 var(--font-script);
  color: var(--ink);
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
  content: attr(data-placeholder);
  display: block;
  height: 0;
}

.fmt-inline :deep(.el-direction.is-empty)::before {
  content: '(' attr(data-placeholder) ')';
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
  content: attr(data-placeholder);
  position: absolute;
  left: 0;
  white-space: nowrap;
}

.fmt-inline :deep(.speech-parenthetical.is-empty)::before {
  content: '(' attr(data-placeholder) ')';
}

.fmt-inline :deep(.speech-line.is-empty)::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
}
</style>
