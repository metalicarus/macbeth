import { describe, expect, it } from 'vitest';
import type { Play } from '../model';
import { fountainToPlay } from './fountain';

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

const sample = `Title: Macbeth
Author: William Shakespeare
Draft date: 1606

# Ato I

## Cena 3 – Uma charneca

Trovão.
Entram as três Bruxas.

PRIMEIRA BRUXA
Onde estiveste, irmã?

SEGUNDA BRUXA
Matando porcos.

MACBETH (V.O.)
(a Banquo)
Dia tão feio e tão belo
eu nunca vi.

[[nota: cortar na versão infantil]]
/* BANQUO
Cena cortada. */

> SILÊNCIO <

CORTA PARA:
`;

describe('fountainToPlay', () => {
  it('lê folha de título, seções, falas e ação', () => {
    const play = fountainToPlay(sample);

    expect(play.titlePage).toEqual({ title: 'Macbeth', author: 'William Shakespeare' });
    expect(outline(play)).toEqual([
      'ato: Ato I',
      'cena: Cena 3 – Uma charneca',
      'rubrica: Trovão. Entram as três Bruxas.',
      'PRIMEIRA BRUXA: Onde estiveste, irmã?',
      'SEGUNDA BRUXA: Matando porcos.',
      'MACBETH (a Banquo): Dia tão feio e tão belo\neu nunca vi.',
      'rubrica: SILÊNCIO',
      'rubrica: CORTA PARA:',
    ]);
    expect(play.characters.map((c) => c.name)).toEqual(['PRIMEIRA BRUXA', 'SEGUNDA BRUXA', 'MACBETH']);
  });

  it('reconhece cabeçalhos de cena de roteiro e forçados com ponto', () => {
    const play = fountainToPlay('INT. CASTELO - NOITE\n\nMACBETH\nOlá.\n\n.SALÃO DO BANQUETE\n\nBANQUO\nOi.');
    expect(outline(play)).toEqual(['cena: INT. CASTELO - NOITE', 'MACBETH: Olá.', 'cena: SALÃO DO BANQUETE', 'BANQUO: Oi.']);
  });

  it('aceita "Ato II" e "Cena 3" escritos como ação', () => {
    const play = fountainToPlay('Ato II\n\nCena 1\n\nMACBETH\nÉ um punhal o que vejo?');
    expect(outline(play)).toEqual(['ato: Ato II', 'cena: Cena 1', 'MACBETH: É um punhal o que vejo?']);
  });

  it('aceita personagem forçado com @ e nomes em caixa mista', () => {
    const play = fountainToPlay('@Lady Macbeth\nVem, noite espessa.');
    expect(outline(play)).toEqual(['Lady Macbeth: Vem, noite espessa.']);
  });

  it('nome em maiúsculas sem diálogo abaixo é ação', () => {
    const play = fountainToPlay('MACBETH – Olá.\n\nBLACKOUT\n\nFIM');
    expect(outline(play)).toEqual(['rubrica: MACBETH – Olá.', 'rubrica: BLACKOUT', 'rubrica: FIM']);
  });

  it('sem folha de título, a folha de rosto fica vazia', () => {
    expect(fountainToPlay('MACBETH\nOlá.').titlePage).toEqual({ title: '', author: '' });
  });
});
