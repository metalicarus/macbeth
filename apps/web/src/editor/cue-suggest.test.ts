// @vitest-environment jsdom
import { addCharacter, createPlay, suggestCharacters, type Play } from '@macbeth/core';
import { Editor, type JSONContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';
import { CueSuggest, type CueSuggestState } from './cue-suggest';
import { PlayKeymap } from './keymap';
import { playExtensions } from './schema';

let editor: Editor;
let last: CueSuggestState;
afterEach(() => editor?.destroy());

function playWith(...names: string[]): Play {
  return names.reduce((play, name) => addCharacter(play, name).play, createPlay());
}

/** Editor com uma fala vazia e o cursor no nome do personagem. */
function openWith(play: Play): void {
  editor = new Editor({
    extensions: [
      ...playExtensions,
      PlayKeymap,
      CueSuggest.configure({
        suggest: (query) => suggestCharacters(play, query),
        onChange: (state) => (last = state),
      }),
    ],
    content: { type: 'doc', content: [{ type: 'speech', content: [{ type: 'speechCue' }, { type: 'speechLine' }] }] },
  });
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 2)));
}

function key(name: string): boolean {
  const event = new KeyboardEvent('keydown', { key: name });
  return editor.view.someProp('handleKeyDown', (f) => f(editor.view, event)) ?? false;
}

const names = () => last.items.map((c) => c.name);
const speech = () => editor.getJSON().content?.[0] as JSONContent | undefined;
const cursorPart = () => editor.state.selection.$from.parent.type.name;

describe('CueSuggest', () => {
  it('mostra os personagens que combinam com o que se digita', () => {
    openWith(playWith('Macbeth', 'Lady Macbeth', 'Banquo'));
    editor.commands.insertContent('mac');

    expect(last.open).toBe(true);
    expect(names()).toEqual(['Lady Macbeth', 'Macbeth']);
  });

  it('fica fechada com o nome vazio ou fora do campo Personagem', () => {
    openWith(playWith('Macbeth'));
    editor.commands.insertContent('M');
    editor.commands.insertContent({ type: 'text', text: '' });
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, editor.state.doc.content.size - 1)));

    expect(last.open).toBe(false);
  });

  it('fica fechada quando o nome digitado já é o único resultado', () => {
    openWith(playWith('Macbeth'));
    editor.commands.insertContent('Macbeth');
    expect(last.open).toBe(false);
  });

  it('Enter aceita a sugestão, liga o personagem e vai para o texto', () => {
    const play = playWith('Macbeth', 'Banquo');
    openWith(play);
    editor.commands.insertContent('ba');

    expect(key('Enter')).toBe(true);
    const cue = speech()?.content?.[0];
    expect(cue?.content?.[0]?.text).toBe('Banquo');
    expect(cue?.attrs?.characterId).toBe(play.characters[1]!.id);
    expect(cursorPart()).toBe('speechLine');
  });

  it('as setas escolhem outra sugestão', () => {
    openWith(playWith('Primeira Bruxa', 'Segunda Bruxa'));
    editor.commands.insertContent('bru');

    key('ArrowDown');
    expect(last.index).toBe(1);
    key('ArrowDown');
    expect(last.index).toBe(0);
    key('ArrowUp');
    key('Enter');
    expect(speech()?.content?.[0]?.content?.[0]?.text).toBe('Segunda Bruxa');
  });

  it('Tab aceita e vai para o parentético', () => {
    openWith(playWith('Macbeth'));
    editor.commands.insertContent('ma');
    key('Tab');

    expect(speech()?.content?.[0]?.content?.[0]?.text).toBe('Macbeth');
    expect(speech()?.content?.map((p) => p.type)).toEqual(['speechCue', 'speechParenthetical', 'speechLine']);
    expect(cursorPart()).toBe('speechParenthetical');
  });

  it('Esc fecha até o nome mudar', () => {
    openWith(playWith('Macbeth', 'Malcolm'));
    editor.commands.insertContent('ma');

    expect(key('Escape')).toBe(true);
    expect(last.open).toBe(false);
    expect(key('Enter')).toBe(true);
    expect(cursorPart()).toBe('speechLine');
  });

  it('com a lista fechada, Enter segue o comportamento normal', () => {
    openWith(playWith('Macbeth'));
    editor.commands.insertContent('Porteiro');

    expect(last.open).toBe(false);
    key('Enter');
    expect(speech()?.content?.[0]?.content?.[0]?.text).toBe('Porteiro');
    expect(cursorPart()).toBe('speechLine');
  });

  it('Esc deixa a lista voltar quando o nome muda', () => {
    openWith(playWith('Macbeth', 'Malcolm'));
    editor.commands.insertContent('m');
    key('Escape');
    editor.commands.insertContent('a');

    expect(last.open).toBe(true);
  });
});
