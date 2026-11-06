import { addCharacter, createPlay, newId, type Play } from '@macbeth/core';
import { getSchema, type JSONContent } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { docToPlay, playToDoc } from './convert';
import { playExtensions } from './schema';

const schema = getSchema(playExtensions);

/** Falha se o documento não respeita o esquema do editor. */
function assertValid(doc: JSONContent): void {
  Node.fromJSON(schema, doc).check();
}

function macbethOpening(): Play {
  let play = createPlay({ title: 'Macbeth', author: 'Shakespeare' });
  const macbeth = addCharacter(play, 'Macbeth');
  const banquo = addCharacter(macbeth.play, 'Banquo');
  play = banquo.play;
  const act = play.acts[0]!;
  return {
    ...play,
    acts: [
      {
        ...act,
        title: 'Ato I',
        scenes: [
          {
            id: newId(),
            title: 'Cena 3',
            place: 'Uma charneca',
            elements: [
              { id: newId(), type: 'direction', text: 'Trovão. Entram Macbeth e Banquo.' },
              { id: newId(), type: 'speech', characterId: macbeth.character.id, text: 'Dia tão feio e tão belo\neu nunca vi.' },
              { id: newId(), type: 'speech', characterId: banquo.character.id, parenthetical: 'às Bruxas', text: 'Quem são vocês?' },
            ],
          },
        ],
      },
    ],
  };
}

describe('playToDoc', () => {
  it('gera um documento válido para o editor', () => {
    assertValid(playToDoc(macbethOpening()));
    assertValid(playToDoc(createPlay()));
  });

  it('põe cada elemento na sequência, com o nome do personagem na fala', () => {
    const doc = playToDoc(macbethOpening());

    expect(doc.content?.map((n) => n.type)).toEqual(['act', 'scene', 'direction', 'speech', 'speech']);
    expect(doc.content?.[3]?.content?.[0]).toMatchObject({ type: 'speechCue', content: [{ text: 'Macbeth' }] });
  });

  it('transforma quebras de verso em hardBreak', () => {
    const line = playToDoc(macbethOpening()).content?.[3]?.content?.[1];
    expect(line?.content?.map((n) => n.type)).toEqual(['text', 'hardBreak', 'text']);
  });
});

describe('docToPlay', () => {
  it('ida e volta mantém a peça igual', () => {
    const play = macbethOpening();
    expect(docToPlay(playToDoc(play), play)).toEqual(play);
  });

  it('ida e volta preserva campos desconhecidos', () => {
    const play = macbethOpening();
    const act = play.acts[0]!;
    const scene = act.scenes[0]!;
    const withUnknown = {
      ...play,
      pro: { tier: 'companhia' },
      acts: [
        {
          ...act,
          color: 'azul',
          scenes: [{ ...scene, lights: 3, elements: scene.elements.map((e) => ({ ...e, stageMark: 'centro' })) }],
        },
      ],
    } as unknown as Play;

    expect(docToPlay(playToDoc(withUnknown), withUnknown)).toEqual(withUnknown);
  });

  it('cria ato e cena sem título para elementos soltos no começo', () => {
    const play = createPlay();
    const doc: JSONContent = { type: 'doc', content: [{ type: 'direction', content: [{ type: 'text', text: 'Escuro.' }] }] };

    const result = docToPlay(doc, play);
    expect(result.acts).toHaveLength(1);
    expect(result.acts[0]?.title).toBe('');
    expect(result.acts[0]?.scenes[0]?.elements[0]).toMatchObject({ type: 'direction', text: 'Escuro.' });
  });

  it('documento vazio ainda tem um ato', () => {
    expect(docToPlay({ type: 'doc', content: [] }, createPlay()).acts).toHaveLength(1);
  });

  describe('personagem da fala', () => {
    function speechDoc(cue: JSONContent): JSONContent {
      return {
        type: 'doc',
        content: [{ type: 'speech', content: [cue, { type: 'speechLine', content: [{ type: 'text', text: 'Olá.' }] }] }],
      };
    }

    it('cadastra o personagem quando o nome digitado é novo', () => {
      const result = docToPlay(speechDoc({ type: 'speechCue', content: [{ type: 'text', text: 'Porteiro' }] }), createPlay());
      const porteiro = result.characters.find((c) => c.name === 'Porteiro');

      expect(porteiro).toBeDefined();
      expect(result.acts[0]?.scenes[0]?.elements[0]).toMatchObject({ type: 'speech', characterId: porteiro?.id });
    });

    it('liga ao personagem existente pelo nome, sem diferenciar caixa', () => {
      const { play, character } = addCharacter(createPlay(), 'Lady Macbeth');
      const result = docToPlay(speechDoc({ type: 'speechCue', content: [{ type: 'text', text: 'LADY MACBETH' }] }), play);

      expect(result.characters).toHaveLength(1);
      expect(result.acts[0]?.scenes[0]?.elements[0]).toMatchObject({ characterId: character.id });
    });

    it('o nome digitado vence o id ligado à fala', () => {
      const a = addCharacter(createPlay(), 'Macbeth');
      const b = addCharacter(a.play, 'Banquo');
      const cue = { type: 'speechCue', attrs: { characterId: a.character.id }, content: [{ type: 'text', text: 'Banquo' }] };

      expect(docToPlay(speechDoc(cue), b.play).acts[0]?.scenes[0]?.elements[0]).toMatchObject({
        characterId: b.character.id,
      });
    });

    it('fala sem personagem vira rubrica, sem perder o texto', () => {
      const result = docToPlay(speechDoc({ type: 'speechCue' }), createPlay());
      expect(result.acts[0]?.scenes[0]?.elements[0]).toMatchObject({ type: 'direction', text: 'Olá.' });
    });
  });
});

describe('cortes e notas', () => {
  function annotatedPlay(): Play {
    const play = macbethOpening();
    const [direction, speech] = play.acts[0]!.scenes[0]!.elements;
    // "Dia tão feio e tão belo\neu nunca vi.": o corte atravessa a quebra de verso.
    speech!.cuts = [{ from: 13, to: 26 }];
    direction!.cuts = [{ from: 0, to: 8 }];
    direction!.notes = [{ id: 'n1', text: 'Trovão gravado, não ao vivo.', createdAt: '2026-11-05T10:00:00.000Z' }];
    return play;
  }

  it('gera um documento válido, com a marcação de corte no texto cortado', () => {
    const doc = playToDoc(annotatedPlay());
    assertValid(doc);

    const direction = doc.content?.[2];
    expect(direction?.attrs?.notes).toHaveLength(1);
    expect(direction?.content?.[0]).toMatchObject({ text: 'Trovão. ', marks: [{ type: 'cut' }] });
    expect(direction?.content?.[1]).toEqual({ type: 'text', text: 'Entram Macbeth e Banquo.' });
  });

  it('ida e volta mantém cortes (mesmo atravessando versos) e notas', () => {
    const play = annotatedPlay();
    expect(docToPlay(playToDoc(play), play)).toEqual(play);
  });

  it('sem cortes nem notas, os campos não aparecem no modelo', () => {
    const play = macbethOpening();
    const element = docToPlay(playToDoc(play), play).acts[0]!.scenes[0]!.elements[0]!;
    expect(element).not.toHaveProperty('cuts');
    expect(element).not.toHaveProperty('notes');
  });
});
