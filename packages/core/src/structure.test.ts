import { describe, expect, it } from 'vitest';
import { addCharacter } from './characters';
import { newId } from './ids';
import { createPlay, type Play, type SceneElement } from './model';
import { castByScene, locate, playOutline } from './structure';

function sample(): { play: Play; ids: Record<string, string> } {
  let play = createPlay();
  const ids: Record<string, string> = {};
  for (const name of ['Macbeth', 'Banquo', 'Porteiro']) {
    const added = addCharacter(play, name);
    play = added.play;
    ids[name] = added.character.id;
  }
  const speech = (who: string): SceneElement => ({ id: newId(), type: 'speech', characterId: ids[who]!, text: '…' });
  const direction = (): SceneElement => ({ id: newId(), type: 'direction', text: 'Entra o Porteiro.' });

  play = {
    ...play,
    acts: [
      {
        id: 'a1',
        title: 'Ato I',
        scenes: [
          { id: 's1', title: 'Cena 1', elements: [speech('Macbeth'), speech('Banquo'), speech('Macbeth')] },
          { id: 's2', title: 'Cena 2', elements: [direction(), speech('Banquo')] },
        ],
      },
      // Ato sem título com cena sem título: texto que começa direto com falas.
      { id: 'a2', title: '', scenes: [{ id: 's3', title: '', elements: [{ ...speech('Macbeth'), id: 'e-first' }] }] },
    ],
  };
  return { play, ids };
}

describe('playOutline', () => {
  it('lista atos e cenas com o número de falas', () => {
    const outline = playOutline(sample().play);
    expect(outline.map((a) => [a.title, a.scenes.map((s) => [s.title, s.speeches])])).toEqual([
      ['Ato I', [['Cena 1', 3], ['Cena 2', 1]]],
      ['', [['', 1]]],
    ]);
  });

  it('navega até o próprio ato ou cena com título, e até o primeiro elemento quando não há título', () => {
    const [act1, act2] = playOutline(sample().play);
    expect(act1?.target).toBe('a1');
    expect(act1?.scenes[0]?.target).toBe('s1');
    expect(act2?.target).toBe('e-first');
    expect(act2?.scenes[0]?.target).toBe('e-first');
  });

  it('cena vazia e sem título não tem para onde navegar', () => {
    const play = createPlay();
    play.acts[0]!.scenes[0]!.title = '';
    expect(playOutline(play)[0]?.scenes[0]?.target).toBeNull();
  });
});

describe('locate', () => {
  it('acha o ato e a cena de um elemento, de uma cena ou de um ato', () => {
    const { play } = sample();
    expect(locate(play, 'e-first')).toEqual({ actId: 'a2', sceneId: 's3' });
    expect(locate(play, 's2')).toEqual({ actId: 'a1', sceneId: 's2' });
    expect(locate(play, 'a1')).toEqual({ actId: 'a1' });
    expect(locate(play, 'nada')).toBeNull();
  });
});

describe('castByScene', () => {
  it('conta as falas de cada personagem por cena; rubrica não conta como presença', () => {
    const { play, ids } = sample();
    const { columns, speeches } = castByScene(play);

    expect(columns.map((c) => [c.actIndex, c.scene.id])).toEqual([
      [0, 's1'],
      [0, 's2'],
      [1, 's3'],
    ]);
    expect([...speeches.get(ids.Macbeth!)!]).toEqual([
      ['s1', 2],
      ['s3', 1],
    ]);
    expect([...speeches.get(ids.Banquo!)!]).toEqual([
      ['s1', 1],
      ['s2', 1],
    ]);
    expect(speeches.get(ids.Porteiro!)?.size).toBe(0);
  });
});
