import type { Id } from '@macbeth/core';
import type { Editor } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

/** Id do elemento da peça (ato, cena, rubrica, fala) onde está o cursor. */
export function elementIdAt(state: EditorState): Id | null {
  const { $from } = state.selection;
  if ($from.depth < 1) return null;
  return ($from.node(1).attrs.id as Id | null) ?? null;
}

/** Posição do elemento no documento, ou null se não existir. */
export function elementPos(state: EditorState, id: Id): number | null {
  let found: number | null = null;
  state.doc.forEach((node, offset) => {
    if (found === null && node.attrs.id === id) found = offset;
  });
  return found;
}

/**
 * Põe o cursor no começo do elemento (na fala, no nome do personagem) e
 * rola o texto até ele. Devolve false se o elemento não estiver no texto.
 */
export function goToElement(editor: Editor, id: Id): boolean {
  const pos = elementPos(editor.state, id);
  if (pos === null) return false;

  const node = editor.state.doc.nodeAt(pos)!;
  // Na fala o texto começa um nível mais fundo, dentro do nome.
  const cursor = pos + (node.isTextblock ? 1 : 2);
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, cursor)));
  editor.view.focus();

  const dom = editor.view.nodeDOM(pos);
  if (dom instanceof HTMLElement) dom.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  return true;
}
