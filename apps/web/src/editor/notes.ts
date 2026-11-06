import { createNote, type Id, type Note } from '@macbeth/core';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { elementPos } from './navigate';

/*
 * Notas pessoais presas a falas e rubricas. Ficam no atributo `notes` do
 * elemento e são editadas pelo painel. Mexer nelas não entra no Ctrl+Z do
 * texto: desfazer letra por letra o que se escreveu numa nota confundiria.
 */

type Dispatch = (tr: Transaction) => void;

const ANNOTATABLE = new Set(['direction', 'speech']);

function notesAt(state: EditorState, pos: number): Note[] {
  return (state.doc.nodeAt(pos)?.attrs.notes as Note[] | null) ?? [];
}

function setNotes(state: EditorState, dispatch: Dispatch | undefined, pos: number, notes: Note[]): void {
  dispatch?.(state.tr.setNodeAttribute(pos, 'notes', notes.length ? notes : null).setMeta('addToHistory', false));
}

/** Nova nota na fala ou rubrica onde está o cursor. Devolve a nota, ou null se ali não cabe nota. */
export function addNote(state: EditorState, dispatch?: Dispatch, text = ''): Note | null {
  const { $from } = state.selection;
  if ($from.depth < 1 || !ANNOTATABLE.has($from.node(1).type.name)) return null;
  const pos = $from.before(1);
  const note = createNote(text);
  setNotes(state, dispatch, pos, [...notesAt(state, pos), note]);
  return note;
}

export function updateNote(
  state: EditorState,
  dispatch: Dispatch | undefined,
  elementId: Id,
  noteId: Id,
  patch: Partial<Pick<Note, 'text' | 'resolved'>>,
): boolean {
  const pos = elementPos(state, elementId);
  if (pos === null) return false;
  const notes = notesAt(state, pos);
  if (!notes.some((n) => n.id === noteId)) return false;
  setNotes(
    state,
    dispatch,
    pos,
    notes.map((n) => {
      if (n.id !== noteId) return n;
      const next = { ...n, ...patch };
      // "resolvida: falso" não precisa ficar no arquivo.
      if (!next.resolved) delete next.resolved;
      return next;
    }),
  );
  return true;
}

export function removeNote(state: EditorState, dispatch: Dispatch | undefined, elementId: Id, noteId: Id): boolean {
  const pos = elementPos(state, elementId);
  if (pos === null) return false;
  const notes = notesAt(state, pos);
  if (!notes.some((n) => n.id === noteId)) return false;
  setNotes(
    state,
    dispatch,
    pos,
    notes.filter((n) => n.id !== noteId),
  );
  return true;
}

export interface NotePinsOptions {
  /** Clique num alfinete da margem. */
  onOpen: (noteId: Id) => void;
}

/**
 * Alfinetes numerados na margem, um por elemento com notas, na mesma
 * numeração da lista do painel. Notas resolvidas deixam o alfinete apagado.
 */
export const NotePins = Extension.create<NotePinsOptions>({
  name: 'notePins',

  addOptions() {
    return { onOpen: () => {} };
  },

  addProseMirrorPlugins() {
    const onOpen = (id: Id) => this.options.onOpen(id);
    return [
      new Plugin({
        key: new PluginKey('notePins'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            let number = 0;
            state.doc.forEach((node, offset) => {
              const notes = (node.attrs.notes as Note[] | null) ?? [];
              if (!notes.length) return;
              const numbers = notes.map(() => ++number);
              const resolved = notes.every((n) => n.resolved);
              const first = notes[0]!.id;
              decorations.push(
                Decoration.widget(
                  offset + 1,
                  () => {
                    const pin = document.createElement('button');
                    pin.type = 'button';
                    pin.className = resolved ? 'notepin resolved' : 'notepin';
                    pin.contentEditable = 'false';
                    pin.textContent = numbers.join(',');
                    pin.addEventListener('mousedown', (event) => {
                      event.preventDefault();
                      onOpen(first);
                    });
                    return pin;
                  },
                  { side: -1, key: `pin-${numbers.join(',')}-${resolved}`, ignoreSelection: true },
                ),
              );
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
