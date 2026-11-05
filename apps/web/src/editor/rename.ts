import { normalizeName, type Id } from '@macbeth/core';
import type { EditorState, Transaction } from '@tiptap/pm/state';

/**
 * Troca o nome do personagem em todas as falas dele. Vale para as falas
 * ligadas pelo id e também para as que ainda só têm o nome antigo digitado.
 *
 * A troca fica fora do histórico do Ctrl+Z: ela acompanha uma mudança no
 * cadastro, que não se desfaz pelo texto. Desfazer só no texto deixaria a
 * fala com o nome antigo e o cadastro com o novo.
 */
export function renameCues(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  id: Id,
  oldName: string,
  newName: string,
): boolean {
  const old = normalizeName(oldName);
  const tr = state.tr;

  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'speechCue') return;
    const linked = node.attrs.characterId === id;
    const typedOldName = !node.attrs.characterId && normalizeName(node.textContent) === old;
    if (!linked && !typedOldName) return false;

    const from = tr.mapping.map(pos + 1);
    const to = tr.mapping.map(pos + 1 + node.content.size);
    tr.replaceWith(from, to, state.schema.text(newName));
    tr.setNodeAttribute(tr.mapping.map(pos), 'characterId', id);
    return false;
  });

  if (!tr.docChanged) return false;
  dispatch?.(tr.setMeta('addToHistory', false));
  return true;
}
