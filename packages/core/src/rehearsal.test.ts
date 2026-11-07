import { describe, expect, it } from 'vitest';
import { addCharacter } from './characters';
import { createPlay, type Play, type SceneElement } from './model';
import { cueStart, initials, rehearsalScript, scenesWithCharacter, type RehearsalLine } from './rehearsal';

function sample(): { play: Play; macbeth: string; banquo: string } {
  const m = addCharacter(createPlay(), 'Macbeth');
  const b = addCharacter(m.play, 'Banquo');
  const speech = (id: string, who: string, text: string, extra: Partial<SceneElement> = {}): SceneElement =>
    ({ id, type: 'speech', characterId: who, text, ...extra }) as SceneElement;
  const direction = (id: string, text: string, extra: Partial<SceneElement> = {}): SceneElement =>
    ({ id, type: 'direction', text, ...extra }) as SceneElement;

  const play: Play = {
    ...b.play,
    acts: [
      {
        id: 'a1',
        title: 'Ato I',
        scenes: [
          {
            id: 's1',
            title: 'Cena 3',
            elements: [
              direction('d1', 'Trovão. Entram Macbeth e Banquo.'),
              speech('f1', b.character.id, 'Quanto falta para Forres? Que criaturas são estas, tão murchas e tão selvagens nos seus trajes?'),
              direction('d2', 'As Bruxas apontam.'),
              speech('f2', m.character.id, 'Falem, se podem: o que são vocês?'),
              speech('f3', b.character.id, 'Trecho cortado. Fala que fica.', { cuts: [{ from: 0, to: 15 }] }),
              speech('f4', b.character.id, 'Fala cortada inteira.', { cuts: [{ from: 0, to: 21 }] }),
              speech('f5', m.character.id, 'Fiquem!'),
            ],
          },
          { id: 's2', title: 'Cena 4', elements: [speech('f6', b.character.id, 'Só Banquo aqui.')] },
        ],
      },
    ],
  };
  return { play, macbeth: m.character.id, banquo: b.character.id };
}

const speeches = (lines: RehearsalLine[]) => lines.filter((l): l is Extract<RehearsalLine, { kind: 'speech' }> => l.kind === 'speech');

describe('cueStart', () => {
  it('pega as últimas 8 palavras', () => {
    const text = 'um dois três quatro cinco seis sete oito nove dez';
    expect(text.slice(cueStart(text))).toBe('três quatro cinco seis sete oito nove dez');
  });

  it('se a última frase for mais curta, pega só ela', () => {
    const text = 'Quanto falta para Forres? Que criaturas são estas?';
    expect(text.slice(cueStart(text))).toBe('Que criaturas são estas?');
  });

  it('fala curta é a deixa inteira', () => {
    expect(cueStart('Salve!')).toBe(0);
  });
});

describe('initials', () => {
  it('deixa a primeira letra de cada palavra e mantém a pontuação', () => {
    expect(initials('Dia tão feio, d’água!')).toBe('D__ t__ f___, d_____!');
  });
});

describe('scenesWithCharacter', () => {
  it('lista só as cenas em que o personagem fala', () => {
    const { play, macbeth, banquo } = sample();
    expect(scenesWithCharacter(play, macbeth).map((s) => s.id)).toEqual(['s1']);
    expect(scenesWithCharacter(play, banquo).map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('rehearsalScript', () => {
  it('marca as falas do ator e põe a deixa na última fala de outro, pulando rubricas', () => {
    const { play, macbeth } = sample();
    const lines = rehearsalScript(play, { characterId: macbeth, sceneId: 's1', cue: 'words' });
    const [f1, f2, f3, f5] = speeches(lines);

    expect(f2).toMatchObject({ id: 'f2', mine: true });
    expect(f1!.text.slice(f1!.cueStart)).toBe('Que criaturas são estas, tão murchas e tão selvagens nos seus trajes?'.split(' ').slice(-8).join(' '));
    expect(f3).toMatchObject({ id: 'f3', text: 'Fala que fica.', cueStart: 0 });
    expect(f5).toMatchObject({ id: 'f5', mine: true });
  });

  it('usa o texto do espetáculo: trechos cortados somem e falas cortadas inteiras não aparecem', () => {
    const { play, macbeth } = sample();
    const ids = speeches(rehearsalScript(play, { characterId: macbeth, sceneId: 's1', cue: 'words' })).map((l) => l.id);
    expect(ids).toEqual(['f1', 'f2', 'f3', 'f5']);
  });

  it('com a deixa como fala inteira, ela começa no início da fala', () => {
    const { play, macbeth } = sample();
    const [f1] = speeches(rehearsalScript(play, { characterId: macbeth, sceneId: 's1', cue: 'speech' }));
    expect(f1!.cueStart).toBe(0);
  });

  it('a peça inteira traz todas as cenas; a deixa não atravessa a troca de cena', () => {
    const { play, banquo } = sample();
    const lines = rehearsalScript(play, { characterId: banquo, sceneId: null, cue: 'words' });
    expect(lines.filter((l) => l.kind === 'scene').map((l) => l.id)).toEqual(['s1', 's2']);
    // f5 (Macbeth) é a última fala da cena 3; a fala de Banquo na cena 4 não tem deixa dela.
    expect(speeches(lines).find((l) => l.id === 'f5')?.cueStart).toBeUndefined();
  });
});
