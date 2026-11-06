// @vitest-environment jsdom
import type { Note } from '@macbeth/core';
import { Editor, type JSONContent } from '@tiptap/core';
import { UndoRedo } from '@tiptap/extensions/undo-redo';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';
import { elementPos } from './navigate';
import { addNote, NotePins, removeNote, updateNote } from './notes';
import { playExtensions } from './schema';

let editor: Editor;
afterEach(() => editor?.destroy());

const t = (text: string) => [{ type: 'text', text }];
const doc: JSONContent = {
  type: 'doc',
  content: [
    { type: 'scene', attrs: { id: 's1' }, content: t('Cena 1') },
    { type: 'direction', attrs: { id: 'd1' }, content: t('Trovão.') },
    {
      type: 'speech',
      attrs: { id: 'f1' },
      content: [
        { type: 'speechCue', content: t('Macbeth') },
        { type: 'speechLine', content: t('Olá.') },
      ],
    },
  ],
};

function open(): void {
  editor = new Editor({ extensions: [...playExtensions, UndoRedo, NotePins], content: doc });
}

function cursorIn(id: string): void {
  const pos = elementPos(editor.state, id)!;
  const inside = editor.state.doc.nodeAt(pos)!.isTextblock ? pos + 1 : pos + 2;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, inside)));
}

const notesOf = (id: string) => (editor.state.doc.nodeAt(elementPos(editor.state, id)!)!.attrs.notes as Note[] | null) ?? [];
const dispatch = () => editor.view.dispatch;

describe('notas no editor', () => {
  it('cria a nota na fala ou rubrica onde está o cursor', () => {
    open();
    cursorIn('f1');
    const note = addNote(editor.state, dispatch(), 'Pausa longa.');

    expect(note?.text).toBe('Pausa longa.');
    expect(notesOf('f1')).toEqual([note]);
  });

  it('não cria nota em título de cena', () => {
    open();
    cursorIn('s1');
    expect(addNote(editor.state, dispatch())).toBeNull();
  });

  it('edita o texto, marca como resolvida e desmarca', () => {
    open();
    cursorIn('d1');
    const note = addNote(editor.state, dispatch())!;

    updateNote(editor.state, dispatch(), 'd1', note.id, { text: 'Som gravado.' });
    updateNote(editor.state, dispatch(), 'd1', note.id, { resolved: true });
    expect(notesOf('d1')[0]).toMatchObject({ text: 'Som gravado.', resolved: true });

    updateNote(editor.state, dispatch(), 'd1', note.id, { resolved: false });
    expect(notesOf('d1')[0]).not.toHaveProperty('resolved');
  });

  it('apaga a nota; sem notas, o atributo volta a ficar vazio', () => {
    open();
    cursorIn('d1');
    const note = addNote(editor.state, dispatch())!;
    removeNote(editor.state, dispatch(), 'd1', note.id);
    expect(editor.state.doc.nodeAt(elementPos(editor.state, 'd1')!)!.attrs.notes).toBeNull();
  });

  it('mexer nas notas não entra no Ctrl+Z do texto', () => {
    open();
    cursorIn('d1');
    editor.commands.insertContent(' Chuva.');
    addNote(editor.state, dispatch(), 'Som gravado.');
    editor.commands.undo();

    expect(notesOf('d1')).toHaveLength(1);
    expect(editor.state.doc.textContent).not.toContain('Chuva');
  });

  it('mostra um alfinete numerado na margem de cada elemento com notas', () => {
    open();
    cursorIn('d1');
    addNote(editor.state, dispatch());
    cursorIn('f1');
    addNote(editor.state, dispatch());
    addNote(editor.state, dispatch());

    const pins = [...editor.view.dom.querySelectorAll('.notepin')].map((p) => p.textContent);
    expect(pins).toEqual(['1', '2,3']);
  });
});
