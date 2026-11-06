import { describe, expect, it } from 'vitest';
import type { Play } from '../model';
import { summarizePlay } from './builder';
import { paragraphsToPlay, type ImportedParagraph } from './paragraphs';

const p = (...lines: string[]): ImportedParagraph[] => lines.map((text) => ({ text }));

/** Resumo legível: "ato:", "cena:", "rubrica:" ou "NOME (parentético): texto". */
function outline(play: Play): string[] {
  const names = new Map(play.characters.map((c) => [c.id, c.name]));
  return play.acts.flatMap((act) => [
    ...(act.title ? [`ato: ${act.title}`] : []),
    ...act.scenes.flatMap((scene) => [
      ...(scene.title ? [`cena: ${scene.title}`] : []),
      ...scene.elements.map((e) =>
        e.type === 'direction'
          ? `rubrica: ${e.text}`
          : `${names.get(e.characterId)}${e.parenthetical ? ` (${e.parenthetical})` : ''}: ${e.text}`,
      ),
    ]),
  ]);
}

describe('paragraphsToPlay', () => {
  it('reconhece o formato Em linha com travessão, dois-pontos e ponto', () => {
    const play = paragraphsToPlay(
      p(
        'ATO I',
        'Cena 3 – Uma charneca',
        '(Trovão. Entram as três Bruxas.)',
        'PRIMEIRA BRUXA – Onde estiveste, irmã?',
        'SEGUNDA BRUXA: Matando porcos.',
        'PRIMEIRA BRUXA. Salve!',
        'MACBETH – (a Banquo) Dia tão feio e tão belo eu nunca vi.',
      ),
    );

    expect(outline(play)).toEqual([
      'ato: ATO I',
      'cena: Cena 3 – Uma charneca',
      'rubrica: Trovão. Entram as três Bruxas.',
      'PRIMEIRA BRUXA: Onde estiveste, irmã?',
      'SEGUNDA BRUXA: Matando porcos.',
      'PRIMEIRA BRUXA: Salve!',
      'MACBETH (a Banquo): Dia tão feio e tão belo eu nunca vi.',
    ]);
    expect(play.characters.map((c) => c.name)).toEqual(['PRIMEIRA BRUXA', 'SEGUNDA BRUXA', 'MACBETH']);
  });

  it('reconhece o formato Centralizado, com parentético em linha própria', () => {
    const play = paragraphsToPlay(p('MACBETH', '(baixo)', 'Dia tão feio e tão belo', 'eu nunca vi.', '', 'BANQUO (às Bruxas)', 'Quem são vocês?'));

    expect(outline(play)).toEqual(['MACBETH (baixo): Dia tão feio e tão belo\neu nunca vi.', 'BANQUO (às Bruxas): Quem são vocês?']);
  });

  it('parágrafo logo depois da fala continua a fala; depois de linha vazia, vira rubrica', () => {
    const play = paragraphsToPlay(p('MACBETH – Dia tão feio', 'e tão belo eu nunca vi.', '', 'Ouve-se um tambor ao longe.'));

    expect(outline(play)).toEqual(['MACBETH: Dia tão feio\ne tão belo eu nunca vi.', 'rubrica: Ouve-se um tambor ao longe.']);
  });

  it('parágrafo em itálico é rubrica', () => {
    const play = paragraphsToPlay([{ text: 'MACBETH – Olá.' }, { text: 'Ele sai.', italic: true }]);
    expect(outline(play)).toEqual(['MACBETH: Olá.', 'rubrica: Ele sai.']);
  });

  it('"Nome: texto" e "NOME. texto" só contam se o nome se repetir', () => {
    const play = paragraphsToPlay(p('Nota: esta cena é opcional.', 'SILÊNCIO. Ninguém se move.', 'Macbeth: Olá.', 'Macbeth: Adeus.'));

    expect(outline(play)).toEqual([
      'rubrica: Nota: esta cena é opcional.',
      'rubrica: SILÊNCIO. Ninguém se move.',
      'Macbeth: Olá.',
      'Macbeth: Adeus.',
    ]);
  });

  it('junta "MACBETH" e "Macbeth" no mesmo personagem', () => {
    const play = paragraphsToPlay(p('MACBETH – Olá.', 'Macbeth: Adeus.', 'Macbeth: Fim.'));
    expect(play.characters).toHaveLength(1);
    expect(summarizePlay(play).speeches).toBe(3);
  });

  it('a lista de personagens do começo vira o cadastro, com descrição', () => {
    const play = paragraphsToPlay(
      p('PERSONAGENS', 'MACBETH, general do exército do rei Duncan', 'LADY MACBETH – sua esposa', 'PORTEIRO', '', 'ATO I', 'MACBETH – Olá.'),
    );

    expect(play.characters.map((c) => [c.name, c.description])).toEqual([
      ['MACBETH', 'general do exército do rei Duncan'],
      ['LADY MACBETH', 'sua esposa'],
      ['PORTEIRO', undefined],
    ]);
    expect(outline(play)).toEqual(['ato: ATO I', 'MACBETH: Olá.']);
  });

  it('"FIM", "CORTINA" e palavras soltas em maiúsculas viram rubrica, não personagem', () => {
    const play = paragraphsToPlay(p('MACBETH – Adeus.', '', 'CORTINA', '', 'FIM'));
    expect(outline(play)).toEqual(['MACBETH: Adeus.', 'rubrica: CORTINA', 'rubrica: FIM']);
    expect(play.characters).toHaveLength(1);
  });

  it('texto sem atos nem cenas ainda vira uma peça válida', () => {
    const play = paragraphsToPlay(p('Uma sala vazia.', 'MACBETH – Olá.'));
    expect(play.acts).toHaveLength(1);
    expect(outline(play)).toEqual(['rubrica: Uma sala vazia.', 'MACBETH: Olá.']);
  });

  it('resume a peça importada', () => {
    const play = paragraphsToPlay(p('ATO I', 'Cena 1', 'MACBETH – Olá.', 'BANQUO – Oi.', 'ATO II', 'Cena 1', 'MACBETH – Adeus.'));
    expect(summarizePlay(play)).toEqual({ acts: 2, scenes: 2, characters: 2, speeches: 3 });
  });
});
