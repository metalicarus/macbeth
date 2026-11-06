import type { Id } from '@macbeth/core';
import type { Editor } from '@tiptap/core';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

/**
 * Acesso ao editor para o que vive fora dele e precisa mexer no documento,
 * como o painel de notas. O PlayEditor se registra aqui ao nascer.
 */
export const useEditorBridge = defineStore('editorBridge', () => {
  const editor = shallowRef<Editor | null>(null);
  /** Nota a destacar no painel (ao clicar no alfinete ou criar uma nota). */
  const focusedNote = ref<Id | null>(null);

  return { editor, focusedNote };
});
