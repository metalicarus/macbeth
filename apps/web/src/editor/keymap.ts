import { Extension } from '@tiptap/core';
import { Fragment, type Node as PMNode, type ResolvedPos, type Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { classifyLine } from '@macbeth/core';

/*
 * Enter e Tab escolhem o próximo elemento, para que a peça se formate
 * sozinha enquanto se digita:
 *
 *   Enter no fim de      cria
 *   ato                  cena
 *   cena                 rubrica
 *   rubrica              fala
 *   texto da fala        outra fala
 *
 *   Na fala, Enter no personagem ou no parentético vai para o texto. Enter
 *   com o personagem vazio transforma a fala em rubrica.
 *
 *   Tab avança dentro da fala (personagem → parentético → texto) e, numa
 *   rubrica, a transforma em fala. Shift+Tab faz o caminho de volta.
 */

type Dispatch = (tr: Transaction) => void;
type Command = (state: EditorState, dispatch?: Dispatch) => boolean;

const NEXT_AFTER: Record<string, string> = { act: 'scene', scene: 'direction', direction: 'speech' };

/** O elemento da peça (filho direto do documento) onde está o cursor. */
interface Here {
  $from: ResolvedPos;
  element: PMNode;
  start: number;
  end: number;
  /** Parte da fala onde está o cursor, quando o elemento é uma fala. */
  part?: string;
}

function here(state: EditorState): Here | null {
  const { selection } = state;
  if (!selection.empty || selection.$from.depth < 1) return null;
  const $from = selection.$from;
  return {
    $from,
    element: $from.node(1),
    start: $from.before(1),
    end: $from.after(1),
    part: $from.depth >= 2 ? $from.parent.type.name : undefined,
  };
}

function atEnd($from: ResolvedPos): boolean {
  return $from.parentOffset === $from.parent.content.size;
}

function atStart($from: ResolvedPos): boolean {
  return $from.parentOffset === 0;
}

function speechNode(
  schema: Schema,
  { attrs = null, cue, line }: { attrs?: PMNode['attrs'] | null; cue?: PMNode['content']; line?: PMNode['content'] } = {},
): PMNode {
  return schema.nodes.speech!.create(attrs, [
    schema.nodes.speechCue!.create(null, cue),
    schema.nodes.speechLine!.create(null, line),
  ]);
}

function createElement(schema: Schema, type: string): PMNode {
  return type === 'speech' ? speechNode(schema) : schema.nodes[type]!.create();
}

/** Posição do começo do texto de uma parte da fala que começa em `start`. */
function partStart(speech: PMNode, start: number, part: string): number | null {
  let found: number | null = null;
  speech.forEach((child, offset) => {
    if (found === null && child.type.name === part) found = start + 1 + offset + 1;
  });
  return found;
}

function partEnd(speech: PMNode, start: number, part: string): number | null {
  let found: number | null = null;
  speech.forEach((child, offset) => {
    if (found === null && child.type.name === part) found = start + 1 + offset + 1 + child.content.size;
  });
  return found;
}

function childOf(speech: PMNode, part: string): PMNode | undefined {
  let found: PMNode | undefined;
  speech.forEach((child) => {
    if (!found && child.type.name === part) found = child;
  });
  return found;
}

function moveTo(tr: Transaction, pos: number): Transaction {
  return tr.setSelection(TextSelection.create(tr.doc, pos));
}

/** Insere um elemento depois do atual e põe o cursor no lugar de digitar. */
function insertAfter(state: EditorState, h: Here, node: PMNode, dispatch?: Dispatch): boolean {
  if (dispatch) {
    const tr = state.tr.insert(h.end, node);
    // Na fala o cursor vai para o personagem, um nível mais fundo.
    dispatch(moveTo(tr, h.end + (node.type.name === 'speech' ? 2 : 1)).scrollIntoView());
  }
  return true;
}

/**
 * Só o texto, sem cortes nem quebras de verso, para levar o conteúdo a
 * elementos que não aceitam essas coisas (nome do personagem, ato, cena,
 * rubrica). A quebra de verso vira espaço.
 */
function plainText(schema: Schema, content: Fragment): Fragment {
  const text = content.textBetween(0, content.size, ' ', ' ');
  return text ? Fragment.from(schema.text(text)) : Fragment.empty;
}

function speechToDirection(state: EditorState, h: Here, text: PMNode['content'], dispatch?: Dispatch): boolean {
  if (dispatch) {
    // Os atributos (id, notas, campos desconhecidos) acompanham o elemento.
    const direction = state.schema.nodes.direction!.create(h.element.attrs, plainText(state.schema, text));
    dispatch(moveTo(state.tr.replaceWith(h.start, h.end, direction), h.start + 1 + direction.content.size));
  }
  return true;
}

/**
 * Enter no fim de uma rubrica escrita como "Ato II", "Cena 3" ou "MACBETH":
 * a rubrica vira ato, cena ou fala, e o cursor segue para onde se escreve
 * em seguida.
 */
function fountainEnter(state: EditorState, h: Here, dispatch?: Dispatch): boolean {
  const kind = classifyLine(h.element.textContent);
  if (!kind) return false;
  if (!dispatch) return true;

  const { schema } = state;
  const attrs = h.element.attrs;

  if (kind === 'character') {
    const speech = speechNode(schema, { attrs, cue: plainText(schema, h.element.content) });
    const tr = state.tr.replaceWith(h.start, h.end, speech);
    dispatch(moveTo(tr, partStart(speech, h.start, 'speechLine')!).scrollIntoView());
    return true;
  }

  const converted = schema.nodes[kind]!.create({ id: attrs.id, extra: attrs.extra }, plainText(schema, h.element.content));
  const next = createElement(schema, NEXT_AFTER[kind]!);
  const tr = state.tr.replaceWith(h.start, h.end, [converted, next]);
  dispatch(moveTo(tr, h.start + converted.nodeSize + 1).scrollIntoView());
  return true;
}

export const enter: Command = (state, dispatch) => {
  const h = here(state);
  if (!h) return false;
  const { schema } = state;

  if (h.element.type.name === 'direction' && atEnd(h.$from) && fountainEnter(state, h, dispatch)) return true;

  if (h.element.type.name !== 'speech') {
    const next = NEXT_AFTER[h.element.type.name];
    // No meio do texto, o Enter padrão divide o elemento em dois do mesmo tipo.
    if (!next || !atEnd(h.$from)) return false;
    return insertAfter(state, h, createElement(schema, next), dispatch);
  }

  if (h.part === 'speechCue' || h.part === 'speechParenthetical') {
    if (h.part === 'speechCue' && h.$from.parent.content.size === 0) {
      const line = childOf(h.element, 'speechLine');
      return speechToDirection(state, h, line!.content, dispatch);
    }
    if (dispatch) dispatch(moveTo(state.tr, partStart(h.element, h.start, 'speechLine')!));
    return true;
  }

  // Texto da fala: o que estiver depois do cursor vai para uma fala nova.
  if (h.part === 'speechLine') {
    const $from = h.$from;
    const rest = $from.parent.content.cut($from.parentOffset);
    if (dispatch) {
      let tr = state.tr;
      if (!atEnd($from)) tr = tr.delete($from.pos, $from.end());
      const end = tr.mapping.map(h.end);
      tr = tr.insert(end, speechNode(schema, { line: rest }));
      dispatch(moveTo(tr, end + 2).scrollIntoView());
    }
    return true;
  }

  return false;
};

export const tab: Command = (state, dispatch) => {
  const h = here(state);
  if (!h) return false;
  const { schema } = state;

  if (h.element.type.name === 'direction') {
    // O texto da rubrica vira o nome do personagem, como no Final Draft.
    if (dispatch) {
      const speech = speechNode(schema, { attrs: h.element.attrs, cue: plainText(schema, h.element.content) });
      const tr = state.tr.replaceWith(h.start, h.end, speech);
      dispatch(moveTo(tr, h.start + 2 + h.element.content.size));
    }
    return true;
  }

  if (h.element.type.name !== 'speech') return true;

  const parenthetical = childOf(h.element, 'speechParenthetical');
  const goToParenthetical = h.part === 'speechCue' || (h.part === 'speechLine' && atStart(h.$from));

  if (goToParenthetical) {
    if (!dispatch) return true;
    if (parenthetical) {
      dispatch(moveTo(state.tr, partEnd(h.element, h.start, 'speechParenthetical')!));
      return true;
    }
    const cue = childOf(h.element, 'speechCue')!;
    const insertAt = h.start + 1 + cue.nodeSize;
    const tr = state.tr.insert(insertAt, schema.nodes.speechParenthetical!.create());
    dispatch(moveTo(tr, insertAt + 1));
    return true;
  }

  if (h.part === 'speechParenthetical') {
    if (dispatch) dispatch(moveTo(state.tr, partStart(h.element, h.start, 'speechLine')!));
    return true;
  }

  // No meio do texto da fala, Tab não faz nada (e não tira o foco do editor).
  return true;
};

export const shiftTab: Command = (state, dispatch) => {
  const h = here(state);
  if (!h || h.element.type.name !== 'speech') return true;

  const parenthetical = childOf(h.element, 'speechParenthetical');

  if (h.part === 'speechLine' || h.part === 'speechParenthetical') {
    if (!dispatch) return true;
    let tr = state.tr;
    // Parentético vazio some ao sair dele.
    if (parenthetical && parenthetical.content.size === 0) {
      const from = partStart(h.element, h.start, 'speechParenthetical')! - 1;
      tr = tr.delete(from, from + parenthetical.nodeSize);
    }
    const speech = tr.doc.nodeAt(h.start)!;
    dispatch(moveTo(tr, partEnd(speech, h.start, 'speechCue')!));
    return true;
  }

  // No personagem: com a fala vazia, volta a ser rubrica com o nome digitado.
  if (h.part === 'speechCue' && childOf(h.element, 'speechLine')!.content.size === 0 && !parenthetical) {
    return speechToDirection(state, h, h.$from.parent.content, dispatch);
  }
  return true;
};

export const backspace: Command = (state, dispatch) => {
  const h = here(state);
  if (!h || h.element.type.name !== 'speech' || !atStart(h.$from)) return false;

  const parenthetical = childOf(h.element, 'speechParenthetical');

  if (h.part === 'speechLine') {
    if (!dispatch) return true;
    if (parenthetical && parenthetical.content.size === 0) {
      const from = partStart(h.element, h.start, 'speechParenthetical')! - 1;
      const tr = state.tr.delete(from, from + parenthetical.nodeSize);
      dispatch(moveTo(tr, partEnd(tr.doc.nodeAt(h.start)!, h.start, 'speechCue')!));
      return true;
    }
    const previous = parenthetical ? 'speechParenthetical' : 'speechCue';
    dispatch(moveTo(state.tr, partEnd(h.element, h.start, previous)!));
    return true;
  }

  if (h.part === 'speechParenthetical') {
    if (!dispatch) return true;
    let tr = state.tr;
    if (parenthetical!.content.size === 0) {
      const from = partStart(h.element, h.start, 'speechParenthetical')! - 1;
      tr = tr.delete(from, from + parenthetical!.nodeSize);
    }
    dispatch(moveTo(tr, partEnd(tr.doc.nodeAt(h.start)!, h.start, 'speechCue')!));
    return true;
  }

  // Começo do personagem: fala vazia é apagada; com conteúdo, o cursor só volta.
  if (h.part === 'speechCue') {
    if (h.start === 0) return true;
    if (!dispatch) return true;
    const isEmpty = h.element.textContent.length === 0;
    const tr = isEmpty ? state.tr.delete(h.start, h.end) : state.tr;
    dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(h.start), -1)));
    return true;
  }

  return false;
};

/**
 * "(" digitado numa parte vazia da fala: no personagem, a fala vira rubrica
 * (que já aparece entre parênteses); no texto, abre o parentético.
 */
export const openParenthesis: Command = (state, dispatch) => {
  const h = here(state);
  if (!h || h.element.type.name !== 'speech' || h.$from.parent.content.size > 0) return false;

  if (h.part === 'speechCue' && childOf(h.element, 'speechLine')!.content.size === 0) {
    return speechToDirection(state, h, h.$from.parent.content, dispatch);
  }
  if (h.part === 'speechLine' && !childOf(h.element, 'speechParenthetical')) {
    return tab(state, dispatch);
  }
  return false;
};

export const PlayKeymap = Extension.create({
  name: 'playKeymap',
  // Precisa rodar antes do Enter e do Backspace padrão do TipTap.
  priority: 1000,

  addKeyboardShortcuts() {
    const run = (command: Command) => () => command(this.editor.state, this.editor.view.dispatch);
    return {
      Enter: run(enter),
      Tab: run(tab),
      'Shift-Tab': run(shiftTab),
      Backspace: run(backspace),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('playFountainInput'),
        props: {
          handleTextInput: (view, _from, _to, text) => text === '(' && openParenthesis(view.state, view.dispatch),
        },
      }),
    ];
  },
});
