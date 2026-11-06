// @vitest-environment jsdom
import { Editor, type JSONContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';
import { backspace, enter, openParenthesis, shiftTab, tab } from './keymap';
import { playExtensions } from './schema';

let editor: Editor;
afterEach(() => editor?.destroy());

const t = (text: string): JSONContent[] => (text ? [{ type: 'text', text }] : []);
const act = (text: string) => ({ type: 'act', content: t(text) });
const scene = (text: string) => ({ type: 'scene', content: t(text) });
const direction = (text: string) => ({ type: 'direction', content: t(text) });
const speech = (cue: string, line: string, parenthetical?: string) => ({
  type: 'speech',
  content: [
    { type: 'speechCue', content: t(cue) },
    ...(parenthetical !== undefined ? [{ type: 'speechParenthetical', content: t(parenthetical) }] : []),
    { type: 'speechLine', content: t(line) },
  ],
});

function open(...content: JSONContent[]): void {
  editor = new Editor({ extensions: playExtensions, content: { type: 'doc', content } });
}

/** Uma linha por elemento: "tipo:texto" ou, na fala, "speech:personagem|parentético|texto". */
function shape(): string[] {
  const lines: string[] = [];
  editor.state.doc.forEach((node) => {
    if (node.type.name !== 'speech') return void lines.push(`${node.type.name}:${node.textContent}`);
    const parts: string[] = [];
    node.forEach((part) => parts.push(part.textContent));
    lines.push(`speech:${parts.join('|')}`);
  });
  return lines;
}

/** Onde está o cursor: índice do elemento, parte da fala e posição no texto. */
function cursor(): string {
  const $from = editor.state.selection.$from;
  const index = $from.index(0);
  const part = $from.depth >= 2 ? `.${$from.parent.type.name}` : '';
  return `${index}${part}@${$from.parentOffset}`;
}

/** Põe o cursor num elemento (e parte da fala), no começo, no fim ou numa posição. */
function place(index: number, part: string | null, at: 'start' | 'end' | number): void {
  let pos = 0;
  editor.state.doc.forEach((node, offset, i) => {
    if (i !== index) return;
    let block = node;
    let blockStart = offset + 1;
    if (part) {
      node.forEach((child, childOffset) => {
        if (child.type.name === part) {
          block = child;
          blockStart = offset + 1 + childOffset + 1;
        }
      });
    }
    pos = blockStart + (at === 'start' ? 0 : at === 'end' ? block.content.size : at);
  });
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)));
}

const press = (command: typeof enter) => command(editor.state, editor.view.dispatch);

describe('Enter', () => {
  it('no fim do ato cria a cena', () => {
    open(act('Ato I'));
    place(0, null, 'end');
    press(enter);
    expect(shape()).toEqual(['act:Ato I', 'scene:']);
    expect(cursor()).toBe('1@0');
  });

  it('no fim da cena cria a rubrica, e no fim da rubrica cria a fala', () => {
    open(scene('Cena 1'));
    place(0, null, 'end');
    press(enter);
    editor.commands.insertContent('Escuro.');
    press(enter);

    expect(shape()).toEqual(['scene:Cena 1', 'direction:Escuro.', 'speech:|']);
    expect(cursor()).toBe('2.speechCue@0');
  });

  it('no meio da rubrica deixa o Enter padrão dividir', () => {
    open(direction('Trovão. Entram'));
    place(0, null, 7);
    expect(press(enter)).toBe(false);
  });

  it('no personagem vai para o texto da fala', () => {
    open(speech('Macbeth', ''));
    place(0, 'speechCue', 'end');
    press(enter);
    expect(cursor()).toBe('0.speechLine@0');
  });

  it('no parentético vai para o texto da fala', () => {
    open(speech('Macbeth', 'Olá.', 'baixo'));
    place(0, 'speechParenthetical', 'end');
    press(enter);
    expect(cursor()).toBe('0.speechLine@0');
  });

  it('fala com verso quebrado e corte vira rubrica válida, com a quebra virando espaço', () => {
    open({
      type: 'speech',
      attrs: { id: 'f1', notes: [{ id: 'n1', text: 'Pausa.', createdAt: '2026-11-05' }] },
      content: [
        { type: 'speechCue' },
        {
          type: 'speechLine',
          content: [{ type: 'text', text: 'Dia feio' }, { type: 'hardBreak' }, { type: 'text', text: 'e belo', marks: [{ type: 'cut' }] }],
        },
      ],
    });
    place(0, 'speechCue', 'start');
    press(enter);

    editor.state.doc.check();
    expect(shape()).toEqual(['direction:Dia feio e belo']);
    expect(editor.state.doc.child(0).attrs).toMatchObject({ id: 'f1', notes: [{ id: 'n1' }] });
  });

  it('com o personagem vazio transforma a fala em rubrica', () => {
    open(direction('Antes.'), speech('', ''));
    place(1, 'speechCue', 'start');
    press(enter);
    expect(shape()).toEqual(['direction:Antes.', 'direction:']);
    expect(cursor()).toBe('1@0');
  });

  it('no fim do texto abre outra fala', () => {
    open(speech('Macbeth', 'Olá.'));
    place(0, 'speechLine', 'end');
    press(enter);
    expect(shape()).toEqual(['speech:Macbeth|Olá.', 'speech:|']);
    expect(cursor()).toBe('1.speechCue@0');
  });

  it('no meio do texto leva o resto para uma fala nova', () => {
    open(speech('Macbeth', 'Dia feio. E belo.'));
    place(0, 'speechLine', 9);
    press(enter);
    expect(shape()).toEqual(['speech:Macbeth|Dia feio.', 'speech:| E belo.']);
    expect(cursor()).toBe('1.speechCue@0');
  });
});

describe('atalhos no estilo Fountain', () => {
  it('"Ato II" na rubrica vira ato e abre a cena', () => {
    open(direction('Ato II'));
    place(0, null, 'end');
    press(enter);
    expect(shape()).toEqual(['act:Ato II', 'scene:']);
    expect(cursor()).toBe('1@0');
  });

  it('"Cena 2" na rubrica vira cena e abre a rubrica', () => {
    open(direction('Cena 2 – Inverness'));
    place(0, null, 'end');
    press(enter);
    expect(shape()).toEqual(['scene:Cena 2 – Inverness', 'direction:']);
    expect(cursor()).toBe('1@0');
  });

  it('nome em maiúsculas na rubrica vira fala, com o cursor no texto', () => {
    open(direction('LADY MACBETH'));
    place(0, null, 'end');
    press(enter);
    expect(shape()).toEqual(['speech:LADY MACBETH|']);
    expect(cursor()).toBe('0.speechLine@0');
  });

  it('mantém o id da rubrica convertida', () => {
    open({ ...direction('MACBETH'), attrs: { id: 'r1' } });
    place(0, null, 'end');
    press(enter);
    expect(editor.state.doc.child(0).attrs.id).toBe('r1');
  });

  it('rubrica comum segue o Enter normal', () => {
    open(direction('Trovão.'));
    place(0, null, 'end');
    press(enter);
    expect(shape()).toEqual(['direction:Trovão.', 'speech:|']);
  });

  it('"(" no personagem vazio transforma a fala em rubrica', () => {
    open(speech('', ''));
    place(0, 'speechCue', 'start');
    expect(press(openParenthesis)).toBe(true);
    expect(shape()).toEqual(['direction:']);
  });

  it('"(" no texto vazio abre o parentético', () => {
    open(speech('Macbeth', ''));
    place(0, 'speechLine', 'start');
    expect(press(openParenthesis)).toBe(true);
    expect(shape()).toEqual(['speech:Macbeth||']);
    expect(cursor()).toBe('0.speechParenthetical@0');
  });

  it('"(" no meio do texto é só um parêntese', () => {
    open(speech('Macbeth', 'Olá'));
    place(0, 'speechLine', 'end');
    expect(press(openParenthesis)).toBe(false);
  });
});

describe('Tab', () => {
  it('no personagem cria o parentético e vai para ele', () => {
    open(speech('Macbeth', 'Olá.'));
    place(0, 'speechCue', 'end');
    press(tab);
    expect(shape()).toEqual(['speech:Macbeth||Olá.']);
    expect(cursor()).toBe('0.speechParenthetical@0');
  });

  it('no parentético vai para o texto', () => {
    open(speech('Macbeth', 'Olá.', 'baixo'));
    place(0, 'speechParenthetical', 2);
    press(tab);
    expect(cursor()).toBe('0.speechLine@0');
  });

  it('no começo do texto vai para o parentético existente', () => {
    open(speech('Macbeth', 'Olá.', 'baixo'));
    place(0, 'speechLine', 'start');
    press(tab);
    expect(cursor()).toBe('0.speechParenthetical@5');
  });

  it('na rubrica a transforma em fala, com o texto como personagem', () => {
    open(direction('Banquo'));
    place(0, null, 'end');
    press(tab);
    expect(shape()).toEqual(['speech:Banquo|']);
    expect(cursor()).toBe('0.speechCue@6');
  });

  it('nunca deixa o foco sair do editor', () => {
    open(act('Ato I'));
    place(0, null, 'end');
    expect(press(tab)).toBe(true);
  });
});

describe('Shift+Tab', () => {
  it('do texto volta ao personagem, apagando o parentético vazio', () => {
    open(speech('Macbeth', 'Olá.', ''));
    place(0, 'speechLine', 'start');
    press(shiftTab);
    expect(shape()).toEqual(['speech:Macbeth|Olá.']);
    expect(cursor()).toBe('0.speechCue@7');
  });

  it('no personagem de uma fala vazia volta a ser rubrica', () => {
    open(speech('Banquo', ''));
    place(0, 'speechCue', 'end');
    press(shiftTab);
    expect(shape()).toEqual(['direction:Banquo']);
  });
});

describe('Backspace', () => {
  it('no começo do texto volta ao fim do personagem', () => {
    open(speech('Macbeth', 'Olá.'));
    place(0, 'speechLine', 'start');
    press(backspace);
    expect(shape()).toEqual(['speech:Macbeth|Olá.']);
    expect(cursor()).toBe('0.speechCue@7');
  });

  it('apaga o parentético vazio', () => {
    open(speech('Macbeth', 'Olá.', ''));
    place(0, 'speechParenthetical', 'start');
    press(backspace);
    expect(shape()).toEqual(['speech:Macbeth|Olá.']);
    expect(cursor()).toBe('0.speechCue@7');
  });

  it('no começo de uma fala vazia a apaga e volta ao elemento anterior', () => {
    open(direction('Escuro.'), speech('', ''));
    place(1, 'speechCue', 'start');
    press(backspace);
    expect(shape()).toEqual(['direction:Escuro.']);
    expect(cursor()).toBe('0@7');
  });

  it('no começo de uma fala com conteúdo só volta o cursor', () => {
    open(direction('Escuro.'), speech('Macbeth', 'Olá.'));
    place(1, 'speechCue', 'start');
    press(backspace);
    expect(shape()).toEqual(['direction:Escuro.', 'speech:Macbeth|Olá.']);
    expect(cursor()).toBe('0@7');
  });

  it('fora da fala deixa o Backspace padrão agir', () => {
    open(direction('Escuro.'));
    place(0, null, 'end');
    expect(press(backspace)).toBe(false);
  });
});
