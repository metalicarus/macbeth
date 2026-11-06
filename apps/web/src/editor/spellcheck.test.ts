// @vitest-environment jsdom
import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { playExtensions } from './schema';
import { redrawSpellCheck, resetSpellCheck, SpellCheck } from './spellcheck';

let editor: Editor;
afterEach(() => editor?.destroy());

const t = (text: string) => [{ type: 'text', text }];
const doc: JSONContent = {
  type: 'doc',
  content: [
    { type: 'scene', content: t('Cena uma') },
    { type: 'direction', content: t('Entra MACBET corendo.') },
    {
      type: 'speech',
      content: [
        { type: 'speechCue', content: t('Macbet') },
        { type: 'speechLine', content: [...t('Dia tão feiu'), { type: 'hardBreak' }, ...t('eu nunca vi.')] },
      ],
    },
  ],
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

/** Corretor falso: erradas são as palavras desta lista; registra o que foi perguntado. */
function open(wrong: string[], accepted: string[] = []) {
  const asked: string[][] = [];
  editor = new Editor({
    extensions: [
      ...playExtensions,
      SpellCheck.configure({
        delay: 0,
        misspelled: async (words) => {
          asked.push(words);
          return words.filter((w) => wrong.includes(w));
        },
        isAccepted: (word) => accepted.includes(word.toLowerCase()),
      }),
    ],
    content: doc,
  });
  return asked;
}

const underlined = () => [...editor.view.dom.querySelectorAll('.misspelled')].map((e) => e.textContent);

describe('SpellCheck', () => {
  it('sublinha as palavras erradas no texto, inclusive em títulos e depois de quebra de verso', async () => {
    open(['uma', 'corendo', 'feiu', 'nunca']);
    await settle();
    expect(underlined()).toEqual(['uma', 'corendo', 'feiu', 'nunca']);
  });

  it('não verifica o nome do personagem na fala', async () => {
    const asked = open(['Macbet']);
    await settle();
    expect(asked.flat()).not.toContain('Macbet');
    expect(underlined()).toEqual([]);
  });

  it('nomes aceitos não são sublinhados em lugar nenhum', async () => {
    open(['MACBET'], ['macbet']);
    await settle();
    expect(underlined()).toEqual([]);
  });

  it('pergunta ao corretor só pelas palavras novas', async () => {
    const asked = open([]);
    await settle();
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, ' Adeus');
    await settle();
    expect(asked.at(-1)).toEqual(['Adeus']);
  });

  it('recomeçar (outro dicionário) apaga as respostas e verifica tudo de novo', async () => {
    const asked = open(['feiu']);
    await settle();
    resetSpellCheck(editor.view);
    expect(underlined()).toEqual([]);
    await settle();
    expect(asked).toHaveLength(2);
    expect(underlined()).toEqual(['feiu']);
  });

  it('redesenhar aplica a lista de aceitos sem perguntar de novo ao corretor', async () => {
    const accepted: string[] = [];
    const asked = open(['feiu'], accepted);
    await settle();
    accepted.push('feiu');
    redrawSpellCheck(editor.view);
    expect(underlined()).toEqual([]);
    expect(asked).toHaveLength(1);
  });
});
