// @vitest-environment jsdom
import { Editor, type JSONContent } from '@tiptap/core';
import { UndoRedo } from '@tiptap/extensions/undo-redo';
import { afterEach, describe, expect, it } from 'vitest';
import { renameCues } from './rename';
import { playExtensions } from './schema';

let editor: Editor;
afterEach(() => editor?.destroy());

const speech = (cue: string, characterId: string | null, line = 'Olá.'): JSONContent => ({
  type: 'speech',
  content: [
    { type: 'speechCue', attrs: { characterId }, content: [{ type: 'text', text: cue }] },
    { type: 'speechLine', content: [{ type: 'text', text: line }] },
  ],
});

function open(...content: JSONContent[]): void {
  editor = new Editor({ extensions: [...playExtensions, UndoRedo], content: { type: 'doc', content } });
}

const cues = () =>
  (editor.getJSON().content ?? []).map((n) => {
    const cue = n.content?.[0] as JSONContent;
    return [cue.content?.[0]?.text, cue.attrs?.characterId];
  });

describe('renameCues', () => {
  it('troca o nome nas falas ligadas ao personagem e nas digitadas com o nome antigo', () => {
    open(speech('Primeira Bruxa', 'b1'), speech('Banquo', 'ba'), speech('PRIMEIRA BRUXA', null, 'Salve!'));
    renameCues(editor.state, editor.view.dispatch, 'b1', 'Primeira Bruxa', 'Bruxa 1');

    expect(cues()).toEqual([
      ['Bruxa 1', 'b1'],
      ['Banquo', 'ba'],
      ['Bruxa 1', 'b1'],
    ]);
  });

  it('não mexe no texto das falas', () => {
    open(speech('Macbeth', 'm', 'Dia tão feio.'));
    renameCues(editor.state, editor.view.dispatch, 'm', 'Macbeth', 'Rei Macbeth');
    const line = (editor.getJSON().content?.[0] as JSONContent).content?.[1] as JSONContent;
    expect(line.content?.[0]?.text).toBe('Dia tão feio.');
  });

  it('fica fora do Ctrl+Z, que continua desfazendo só o que foi digitado', () => {
    open(speech('Macbeth', 'm'), speech('Macbeth', 'm'));
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, ' Oi.');
    renameCues(editor.state, editor.view.dispatch, 'm', 'Macbeth', 'Rei');
    editor.commands.undo();

    expect(cues()).toEqual([
      ['Rei', 'm'],
      ['Rei', 'm'],
    ]);
    expect(editor.state.doc.textContent).not.toContain('Oi.');
  });

  it('sem falas do personagem, não altera o documento', () => {
    open(speech('Banquo', 'ba'));
    expect(renameCues(editor.state, editor.view.dispatch, 'm', 'Macbeth', 'Rei')).toBe(false);
  });
});
