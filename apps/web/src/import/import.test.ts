// @vitest-environment jsdom
import { summarizePlay, type Play } from '@macbeth/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ImportError, importPlay } from '.';

// Os testes rodam a partir de apps/web.
const fixture = (name: string) => new Uint8Array(readFileSync(join(process.cwd(), 'src/import/fixtures', name)));

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

// A mesma cena, salva pelo LibreOffice nos dois formatos.
const expected = [
  'ato: ATO I',
  'cena: Cena 3 – Uma charneca',
  'rubrica: Trovão. Entram as três Bruxas.',
  'PRIMEIRA BRUXA: Onde estiveste, irmã?',
  'SEGUNDA BRUXA: Matando porcos.',
  'MACBETH (a Banquo): Dia tão feio e tão belo\neu nunca vi.',
  'rubrica: As Bruxas desaparecem.',
  'BANQUO: Para onde foram?',
];

describe('importPlay', () => {
  it.each(['macbeth.docx', 'macbeth.odt'])('reconhece a peça em %s', async (name) => {
    const play = await importPlay(name, fixture(name));

    expect(outline(play)).toEqual(expected);
    expect(play.characters.map((c) => [c.name, c.description])).toEqual([
      ['MACBETH', 'general do rei Duncan'],
      ['BANQUO', 'general'],
      ['PRIMEIRA BRUXA', undefined],
      ['SEGUNDA BRUXA', undefined],
    ]);
    expect(summarizePlay(play)).toEqual({ acts: 1, scenes: 1, characters: 4, speeches: 4 });
  });

  it('lê Fountain pela extensão', async () => {
    const play = await importPlay('cena.fountain', new TextEncoder().encode('MACBETH\nOlá.'));
    expect(outline(play)).toEqual(['MACBETH: Olá.']);
  });

  it('recusa formatos que não sabe ler', async () => {
    await expect(importPlay('peca.pdf', new Uint8Array())).rejects.toMatchObject({ code: 'unsupported' });
  });

  it('arquivo corrompido gera erro de leitura', async () => {
    await expect(importPlay('peca.docx', new TextEncoder().encode('não é zip'))).rejects.toBeInstanceOf(ImportError);
  });
});
