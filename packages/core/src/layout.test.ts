import { describe, expect, it } from 'vitest';
import { addCharacter } from './characters';
import { newId } from './ids';
import { layoutPlay, wrap, type LaidOutPage, type Line, type LayoutOptions } from './layout';
import { createPlay, type Act, type Play, type SceneElement } from './model';

const text = (line: Line) => line.spans.map((s) => s.text).join('');
const pageTexts = (page: LaidOutPage) => page.lines.map(text);

const options = (overrides: Partial<LayoutOptions> = {}): LayoutOptions => ({
  charsPerLine: 30,
  linesPerPage: 12,
  labels: { continues: '(continua)', continued: '(cont.)' },
  ...overrides,
});

/** Peça sem folha de rosto, com um ato por lista de elementos. */
function playWith(characterNames: string[], ...acts: ((ids: Record<string, string>) => SceneElement[])[]): Play {
  let play = createPlay();
  const ids: Record<string, string> = {};
  for (const name of characterNames) {
    const added = addCharacter(play, name);
    play = added.play;
    ids[name] = added.character.id;
  }
  const builtActs: Act[] = acts.map((elements, i) => ({
    id: newId(),
    title: `Ato ${'I'.repeat(i + 1)}`,
    scenes: [{ id: newId(), title: 'Cena 1', elements: elements(ids) }],
  }));
  return { ...play, acts: builtActs };
}

const direction = (t: string): SceneElement => ({ id: newId(), type: 'direction', text: t });
const speech = (characterId: string, t: string, parenthetical?: string): SceneElement => ({
  id: newId(),
  type: 'speech',
  characterId,
  text: t,
  ...(parenthetical ? { parenthetical } : {}),
});

describe('wrap', () => {
  it('quebra por palavras sem passar da largura', () => {
    const lines = wrap([{ text: 'Dia tão feio e tão belo eu nunca vi' }], 12).map(text);
    expect(lines).toEqual(['Dia tão feio', 'e tão belo', 'eu nunca vi']);
    expect(lines.every((l) => l.length <= 12)).toBe(true);
  });

  it('mantém o estilo de cada trecho na mesma linha', () => {
    const [line] = wrap([{ text: 'MACBETH', bold: true }, { text: ' – Olá.' }], 30);
    expect(line?.spans).toEqual([{ text: 'MACBETH', bold: true }, { text: ' – Olá.' }]);
  });

  it('"\\n" força quebra, como nos versos', () => {
    expect(wrap([{ text: 'Dia tão feio\neu nunca vi.' }], 30).map(text)).toEqual(['Dia tão feio', 'eu nunca vi.']);
  });

  it('corta palavra maior que a linha', () => {
    expect(wrap([{ text: 'abcdefghij' }], 4).map(text)).toEqual(['abcd', 'efgh', 'ij']);
  });
});

describe('layoutPlay', () => {
  it('formata ato, cena, rubrica e fala Em linha', () => {
    const play = playWith(['Macbeth'], (c) => [
      direction('Trovão.'),
      speech(c.Macbeth!, 'Dia tão feio e tão belo.', 'baixo'),
    ]);
    const [page] = layoutPlay(play, options({ charsPerLine: 60 }));

    expect(page?.number).toBe(1);
    expect(pageTexts(page!)).toEqual(['ATO I', '', 'Cena 1', '', '(Trovão.)', '', 'MACBETH – (baixo) Dia tão feio e tão belo.']);
    expect(page?.lines[0]).toMatchObject({ align: 'center', spans: [{ bold: true }] });
    expect(page?.lines[6]?.spans).toEqual([
      { text: 'MACBETH', bold: true },
      { text: ' – ' },
      { text: '(baixo)', italic: true },
      { text: ' Dia tão feio e tão belo.' },
    ]);
  });

  it('com título, a primeira página é a folha de rosto, sem número', () => {
    const play = { ...playWith([], () => [direction('Escuro.')]), titlePage: { title: 'Macbeth', author: 'William Shakespeare' } };
    const pages = layoutPlay(play, options());

    expect(pages[0]?.number).toBeNull();
    expect(pageTexts(pages[0]!).filter(Boolean)).toEqual(['MACBETH', 'William Shakespeare']);
    expect(pages[1]?.number).toBe(1);
  });

  it('cada ato a partir do segundo começa em página nova', () => {
    const play = playWith([], () => [direction('Um.')], () => [direction('Dois.')]);
    const pages = layoutPlay(play, options());

    expect(pages.map((p) => p.number)).toEqual([1, 2]);
    expect(pageTexts(pages[1]!)[0]).toBe('ATO II');
  });

  it('título de cena não fica sozinho no pé da página', () => {
    // 9 linhas ocupadas antes da cena 2: sobraria espaço só para o título.
    const play = playWith([], () => [direction('a'), direction('b'), direction('c')]);
    play.acts[0]!.scenes.push({ id: newId(), title: 'Cena 2', elements: [direction('d')] });
    const pages = layoutPlay(play, options({ linesPerPage: 11 }));

    expect(pageTexts(pages[0]!)).not.toContain('Cena 2');
    expect(pageTexts(pages[1]!)[0]).toBe('Cena 2');
  });

  it('fala que não cabe é dividida com "(continua)" e "NOME (cont.)"', () => {
    const long = 'palavra '.repeat(30).trim();
    const play = playWith(['Macbeth'], (c) => [direction('Trovão.'), speech(c.Macbeth!, long)]);
    const pages = layoutPlay(play, options({ linesPerPage: 10 }));

    const first = pageTexts(pages[0]!);
    expect(first.at(-1)).toBe('(continua)');
    expect(first).toHaveLength(10);
    expect(pageTexts(pages[1]!)[0]).toBe('MACBETH (cont.)');

    const words = [...first, ...pageTexts(pages[1]!)].join(' ').match(/palavra/g);
    expect(words).toHaveLength(30);
  });

  it('fala curta que não cabe vai inteira para a página seguinte', () => {
    const play = playWith(['Macbeth'], (c) => [
      direction('a'),
      direction('b'),
      direction('c'),
      speech(c.Macbeth!, 'Uma fala de duas linhas inteiras aqui.'),
    ]);
    // Sobra uma linha só para a fala: não divide.
    const pages = layoutPlay(play, options({ linesPerPage: 11 }));

    expect(pageTexts(pages[1]!)[0]).toMatch(/^MACBETH – /);
    expect(pageTexts(pages[0]!)).not.toContain('(continua)');
  });

  it('nenhuma página passa do limite de linhas', () => {
    const play = playWith(['Macbeth', 'Banquo'], (c) =>
      Array.from({ length: 40 }, (_, i) => speech(i % 2 ? c.Macbeth! : c.Banquo!, 'texto '.repeat(i % 7 + 1).trim())),
    );
    const pages = layoutPlay(play, options());
    expect(pages.every((p) => p.lines.length <= 12)).toBe(true);
    expect(pages.map((p) => p.number)).toEqual(pages.map((_, i) => i + 1));
  });

  it('peça vazia gera uma página', () => {
    expect(layoutPlay(createPlay(), options())).toHaveLength(1);
  });
});

describe('cortes na paginação', () => {
  function playWithCuts(): Play {
    return playWith(['Macbeth', 'Banquo'], (c) => [
      { ...direction('Trovão. Entram as Bruxas.'), cuts: [{ from: 0, to: 8 }] },
      { ...speech(c.Macbeth!, 'Dia tão feio e tão belo eu nunca vi.'), cuts: [{ from: 13, to: 24 }] },
      { ...speech(c.Banquo!, 'Fala cortada inteira.'), cuts: [{ from: 0, to: 21 }] },
      direction('Saem.'),
    ]);
  }

  it('por padrão os trechos cortados somem, e o que foi cortado inteiro some por completo', () => {
    const [page] = layoutPlay(playWithCuts(), options({ charsPerLine: 60 }));
    expect(pageTexts(page!)).toEqual([
      'ATO I',
      '',
      'Cena 1',
      '',
      '(Entram as Bruxas.)',
      '',
      'MACBETH – Dia tão feio eu nunca vi.',
      '',
      '(Saem.)',
    ]);
  });

  it('na cópia da direção os cortes saem riscados, e a fala cortada inteira é riscada até no nome', () => {
    const [page] = layoutPlay(playWithCuts(), options({ charsPerLine: 60, cuts: 'strike' }));
    const texts = pageTexts(page!);

    expect(texts).toContain('MACBETH – Dia tão feio e tão belo eu nunca vi.');
    expect(texts).toContain('BANQUO – Fala cortada inteira.');

    const macbeth = page!.lines.find((l) => text(l).startsWith('MACBETH'))!;
    expect(macbeth.spans.filter((s) => s.struck).map((s) => s.text.trim())).toEqual(['e tão belo']);

    const banquo = page!.lines.find((l) => text(l).startsWith('BANQUO'))!;
    expect(banquo.spans.every((s) => s.struck)).toBe(true);
  });
});

describe('idioma da peça na paginação', () => {
  it('põe os nomes em maiúsculas segundo a língua da peça', () => {
    // Em turco, "i" minúsculo vira "İ" com ponto.
    const base = playWith(['Kiral'], (c) => [speech(c.Kiral!, 'Merhaba.')]);
    const turkish = { ...base, titlePage: { ...base.titlePage, language: 'tr' } };

    expect(pageTexts(layoutPlay(base, options({ charsPerLine: 60 }))[0]!)).toContain('KIRAL – Merhaba.');
    expect(pageTexts(layoutPlay(turkish, options({ charsPerLine: 60 }))[0]!)).toContain('KİRAL – Merhaba.');
  });
});
