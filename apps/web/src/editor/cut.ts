import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/*
 * Cortar e descortar trechos (Ctrl+Shift+X).
 *
 *   Com seleção: corta o trecho; se ele já estiver todo cortado, descorta.
 *   Sem seleção: faz o mesmo com o texto inteiro da fala ou rubrica onde
 *   está o cursor.
 *
 * Só o texto de falas e rubricas aceita corte; nome do personagem,
 * parentético e títulos ficam de fora (o esquema não deixa marcá-los).
 */

/** Trecho do texto da fala ou rubrica onde está o cursor. */
function elementTextRange(state: EditorState): { from: number; to: number } | null {
  const { $from } = state.selection;
  if ($from.depth < 1) return null;
  const element = $from.node(1);
  const start = $from.before(1);

  if (element.type.name === 'direction') return { from: start + 1, to: start + 1 + element.content.size };
  if (element.type.name !== 'speech') return null;

  let range: { from: number; to: number } | null = null;
  element.forEach((part, offset) => {
    if (part.type.name === 'speechLine') {
      const from = start + 1 + offset + 1;
      range = { from, to: from + part.content.size };
    }
  });
  return range;
}

export function toggleCut(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const cut = state.schema.marks.cut!;
  const { empty, from, to } = state.selection;
  const range = empty ? elementTextRange(state) : { from, to };
  if (!range || range.from === range.to) return false;

  // "Todo cortado" considera só o texto que aceita corte dentro do trecho.
  let hasCuttable = false;
  let allCut = true;
  state.doc.nodesBetween(range.from, range.to, (node, _pos, parent) => {
    if (!node.isInline || !parent?.type.allowsMarkType(cut)) return;
    hasCuttable = true;
    if (!cut.isInSet(node.marks)) allCut = false;
  });
  if (!hasCuttable) return false;

  if (dispatch) {
    const tr = allCut ? state.tr.removeMark(range.from, range.to, cut) : state.tr.addMark(range.from, range.to, cut.create());
    dispatch(tr);
  }
  return true;
}

/** O texto da rubrica ou da fala (sem nome e parentético) está todo cortado. */
export function isElementFullyCut(element: PMNode): boolean {
  const text = element.type.name === 'speech' ? element.lastChild : element;
  if (!text || text.content.size === 0) return false;
  let allCut = true;
  text.forEach((child) => {
    if (!child.marks.some((m) => m.type.name === 'cut')) allCut = false;
  });
  return allCut;
}

export const CutCommand = Extension.create({
  name: 'cutCommand',

  addKeyboardShortcuts() {
    return { 'Mod-Shift-x': () => toggleCut(this.editor.state, this.editor.view.dispatch) };
  },

  // Elementos cortados por inteiro ganham a classe "fully-cut": somem por
  // completo quando os cortes estão escondidos (sem deixar "()" para trás).
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('fullyCut'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            state.doc.forEach((node, offset) => {
              if (isElementFullyCut(node)) {
                decorations.push(Decoration.node(offset, offset + node.nodeSize, { class: 'fully-cut' }));
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
