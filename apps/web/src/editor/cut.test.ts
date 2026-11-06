// @vitest-environment jsdom
import { Editor, type JSONContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';
import { isElementFullyCut, toggleCut } from './cut';
import { playExtensions } from './schema';

let editor: Editor;
afterEach(() => editor?.destroy());

const t = (text: string) => [{ type: 'text', text }];
const doc: JSONContent = {
  type: 'doc',
  content: [
    { type: 'scene', content: t('Cena 1') },
    { type: 'direction', content: t('Trovão. Entram as Bruxas.') },
    {
      type: 'speech',
      content: [
        { type: 'speechCue', content: t('Macbeth') },
        { type: 'speechParenthetical', content: t('baixo') },
        { type: 'speechLine', content: t('Dia tão feio e tão belo.') },
      ],
    },
  ],
};

function open(): void {
  editor = new Editor({ extensions: playExtensions, content: doc });
}

/** Posição absoluta de um texto no documento. */
function find(text: string): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text!.includes(text)) found = pos + node.text!.indexOf(text);
  });
  return found;
}

function select(text: string): void {
  const from = find(text);
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, from + text.length)));
}

function cursorAt(text: string): void {
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, find(text))));
}

/** Texto cortado, na ordem do documento. */
function cutText(): string[] {
  const parts: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.isText && node.marks.some((m) => m.type.name === 'cut')) parts.push(node.text!);
  });
  return parts;
}

const press = () => toggleCut(editor.state, editor.view.dispatch);

describe('toggleCut', () => {
  it('corta o trecho selecionado', () => {
    open();
    select('e tão belo');
    expect(press()).toBe(true);
    expect(cutText()).toEqual(['e tão belo']);
  });

  it('com o trecho já todo cortado, descorta', () => {
    open();
    select('e tão belo');
    press();
    select('e tão belo');
    press();
    expect(cutText()).toEqual([]);
  });

  it('seleção parcialmente cortada é cortada por inteiro', () => {
    open();
    select('tão belo');
    press();
    // Depois do primeiro corte o texto fica em pedaços: seleciona de "feio" até o fim de "belo".
    const from = find('feio');
    const to = find('belo') + 'belo'.length;
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)));
    press();
    expect(cutText().join('')).toBe('feio e tão belo');
  });

  it('sem seleção, corta o texto inteiro da fala, mas não o nome nem o parentético', () => {
    open();
    cursorAt('feio');
    press();
    expect(cutText()).toEqual(['Dia tão feio e tão belo.']);
  });

  it('sem seleção numa rubrica, corta a rubrica inteira, e de novo descorta', () => {
    open();
    cursorAt('Entram');
    press();
    expect(cutText()).toEqual(['Trovão. Entram as Bruxas.']);
    press();
    expect(cutText()).toEqual([]);
  });

  it('título de cena e nome do personagem não são cortáveis', () => {
    open();
    cursorAt('Cena');
    expect(press()).toBe(false);
    select('Macbeth');
    expect(press()).toBe(false);
    expect(cutText()).toEqual([]);
  });
});

describe('isElementFullyCut', () => {
  it('só quando todo o texto da fala ou rubrica está cortado', () => {
    open();
    cursorAt('feio');
    press();
    const [, direction, speech] = [0, 1, 2].map((i) => editor.state.doc.child(i));
    expect(isElementFullyCut(speech!)).toBe(true);
    expect(isElementFullyCut(direction!)).toBe(false);
  });
});
