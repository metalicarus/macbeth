// @vitest-environment jsdom
import { Editor, type JSONContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';
import { elementIdAt, elementPos, goToElement } from './navigate';
import { playExtensions } from './schema';

let editor: Editor;
afterEach(() => editor?.destroy());

const t = (text: string) => [{ type: 'text', text }];
const doc: JSONContent = {
  type: 'doc',
  content: [
    { type: 'act', attrs: { id: 'a1' }, content: t('Ato I') },
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
  editor = new Editor({ extensions: playExtensions, content: doc });
}

describe('navegação no editor', () => {
  it('acha a posição de um elemento pelo id', () => {
    open();
    expect(elementPos(editor.state, 'a1')).toBe(0);
    expect(elementPos(editor.state, 'f1')).not.toBeNull();
    expect(elementPos(editor.state, 'nada')).toBeNull();
  });

  it('diz em que elemento está o cursor, inclusive dentro da fala', () => {
    open();
    const inSpeech = elementPos(editor.state, 'f1')! + 4;
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, inSpeech)));
    expect(elementIdAt(editor.state)).toBe('f1');
  });

  it('vai até a cena e põe o cursor no começo dela', () => {
    open();
    expect(goToElement(editor, 's1')).toBe(true);
    expect(elementIdAt(editor.state)).toBe('s1');
    expect(editor.state.selection.$from.parentOffset).toBe(0);
  });

  it('numa fala, o cursor vai para o nome do personagem', () => {
    open();
    goToElement(editor, 'f1');
    expect(editor.state.selection.$from.parent.type.name).toBe('speechCue');
  });

  it('id que não está no texto não move o cursor', () => {
    open();
    const before = editor.state.selection.from;
    expect(goToElement(editor, 'nada')).toBe(false);
    expect(editor.state.selection.from).toBe(before);
  });
});
