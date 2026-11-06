import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { addCharacter } from './characters';
import { newId } from './ids';
import { MbthError, readMbth, writeMbth } from './mbth';
import { createPlay, SCHEMA_VERSION, type Play } from './model';

function samplePlay(): Play {
  const { play, character } = addCharacter(createPlay({ title: 'Macbeth', author: 'Shakespeare' }), 'Macbeth');
  const act = play.acts[0]!;
  const scene = act.scenes[0]!;
  return {
    ...play,
    acts: [
      {
        ...act,
        scenes: [
          {
            ...scene,
            place: 'Uma charneca',
            elements: [
              { id: newId(), type: 'direction', text: 'Trovão. Entram as três Bruxas.' },
              { id: newId(), type: 'speech', characterId: character.id, text: 'Dia tão feio e tão belo eu nunca vi.' },
            ],
          },
        ],
      },
    ],
  };
}

function zipWithPlay(play: unknown, extras: Record<string, Uint8Array> = {}): Uint8Array {
  return zipSync({ ...extras, 'play.json': strToU8(JSON.stringify(play)) });
}

function expectCode(fn: () => unknown, code: MbthError['code']): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(MbthError);
    expect((error as MbthError).code).toBe(code);
    return;
  }
  throw new Error(`esperava MbthError "${code}"`);
}

describe('writeMbth / readMbth', () => {
  it('ida e volta mantém a peça igual', () => {
    const play = samplePlay();
    expect(readMbth(writeMbth({ play, extras: {} })).play).toEqual(play);
  });

  it('preserva campos desconhecidos em todos os níveis', () => {
    const play = samplePlay() as Play & Record<string, unknown>;
    const withUnknown = {
      ...play,
      proSettings: { tier: 'companhia' },
      characters: play.characters.map((c) => ({ ...c, actor: 'Ana Lima' })),
      acts: play.acts.map((a) => ({
        ...a,
        scenes: a.scenes.map((s) => ({
          ...s,
          elements: s.elements.map((e) => ({ ...e, stageMark: 'centro' })),
        })),
      })),
    };

    const reread = readMbth(writeMbth(readMbth(zipWithPlay(withUnknown)))).play;
    expect(reread).toEqual(withUnknown);
  });

  it('preserva entradas desconhecidas do zip', () => {
    const stage = strToU8('{"marks":[]}');
    const file = readMbth(zipWithPlay(samplePlay(), { 'pro/stage.json': stage }));

    expect(file.extras['pro/stage.json']).toEqual(stage);
    expect(readMbth(writeMbth(file)).extras['pro/stage.json']).toEqual(stage);
  });
});

describe('readMbth com arquivos ruins', () => {
  it('recusa o que não é zip', () => {
    expectCode(() => readMbth(strToU8('olá')), 'not-a-zip');
  });

  it('recusa zip sem play.json', () => {
    expectCode(() => readMbth(zipSync({ 'outra.txt': strToU8('x') })), 'missing-play');
  });

  it('recusa JSON corrompido', () => {
    expectCode(() => readMbth(zipSync({ 'play.json': strToU8('{') })), 'invalid-json');
  });

  it('recusa arquivo de versão mais nova', () => {
    expectCode(() => readMbth(zipWithPlay({ ...samplePlay(), schemaVersion: SCHEMA_VERSION + 1 })), 'newer-version');
  });

  it('recusa fala de personagem que não existe', () => {
    const play = samplePlay();
    play.acts[0]!.scenes[0]!.elements.push({ id: newId(), type: 'speech', characterId: 'fantasma', text: '…' });
    expectCode(() => readMbth(zipWithPlay(play)), 'invalid-structure');
  });

  it('aceita cortes e notas e os mantém na ida e volta', () => {
    const play = samplePlay();
    const speech = play.acts[0]!.scenes[0]!.elements[1]!;
    speech.cuts = [{ from: 4, to: 8 }];
    speech.notes = [{ id: 'n1', text: 'Pausa longa.', createdAt: '2026-11-05T10:00:00.000Z', resolved: true }];

    expect(readMbth(writeMbth({ play, extras: {} })).play).toEqual(play);
  });

  it('recusa corte com posição que não é número inteiro', () => {
    const play = samplePlay() as unknown as { acts: { scenes: { elements: Record<string, unknown>[] }[] }[] };
    play.acts[0]!.scenes[0]!.elements[1]!.cuts = [{ from: 'início', to: 3 }];
    expect(() => readMbth(zipWithPlay(play))).toThrow('cuts[0].from');
  });

  it('recusa nota sem texto', () => {
    const play = samplePlay() as unknown as { acts: { scenes: { elements: Record<string, unknown>[] }[] }[] };
    play.acts[0]!.scenes[0]!.elements[0]!.notes = [{ id: 'n1', createdAt: '2026-11-05' }];
    expect(() => readMbth(zipWithPlay(play))).toThrow('notes[0].text');
  });

  it('aponta o caminho do campo inválido', () => {
    const play = samplePlay() as unknown as { titlePage: { title: unknown } };
    play.titlePage.title = 42;
    expect(() => readMbth(zipWithPlay(play))).toThrow('peça.titlePage.title');
  });
});

describe('idioma da peça no arquivo', () => {
  it('guarda o idioma e aceita arquivos antigos sem ele', () => {
    const play = samplePlay();
    play.titlePage.language = 'es';
    expect(readMbth(writeMbth({ play, extras: {} })).play.titlePage.language).toBe('es');
    expect(readMbth(writeMbth({ play: samplePlay(), extras: {} })).play.titlePage).not.toHaveProperty('language');
  });

  it('recusa idioma que não é texto', () => {
    const play = samplePlay() as unknown as { titlePage: Record<string, unknown> };
    play.titlePage.language = 42;
    expect(() => readMbth(zipWithPlay(play))).toThrow('titlePage.language');
  });
});
