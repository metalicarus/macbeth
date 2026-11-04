<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { onBeforeUnmount } from 'vue';
import { docToPlay, playToDoc } from '../editor/convert';
import { playExtensions } from '../editor/schema';
import { usePlayStore } from '../stores/play';

const store = usePlayStore();

const editor = useEditor({
  extensions: playExtensions,
  content: playToDoc(store.play),
  editorProps: {
    attributes: { class: 'script', spellcheck: 'true', lang: 'pt-BR' },
  },
  onUpdate: ({ editor }) => store.replace(docToPlay(editor.getJSON(), store.play)),
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
 */
.fmt-inline :deep(.el-direction)::before {
  content: '(';
}

.fmt-inline :deep(.el-direction)::after {
  content: ')';
}

.fmt-inline :deep(.speech-cue)::after {
  content: ' – ';
  font-weight: 400;
}

.fmt-inline :deep(.speech-parenthetical)::before {
  content: '(';
}

.fmt-inline :deep(.speech-parenthetical)::after {
  content: ') ';
}
</style>
