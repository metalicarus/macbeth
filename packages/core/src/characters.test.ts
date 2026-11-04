import { describe, expect, it } from 'vitest';
import {
  addCharacter,
  CHARACTER_COLORS,
  CharacterError,
  countSpeeches,
  findCharacterByName,
  removeCharacter,
  renameCharacter,
  suggestCharacters,
} from './characters';
import { newId } from './ids';
import { createPlay, type Play } from './model';

function withSpeeches(play: Play, characterIds: string[]): Play {
  const [act] = play.acts;
  const [scene] = act!.scenes;
  const elements = characterIds.map((characterId) => ({
    id: newId(),
    type: 'speech' as const,
    characterId,
    text: '…',
  }));
  return { ...play, acts: [{ ...act!, scenes: [{ ...scene!, elements }] }] };
}

function playWith(...names: string[]): Play {
  return names.reduce((play, name) => addCharacter(play, name).play, createPlay());
}

describe('addCharacter', () => {
  it('cadastra com nome limpo e a próxima cor de fita', () => {
    const { play, character } = addCharacter(playWith('Macbeth'), '  Lady   Macbeth ');

    expect(character.name).toBe('Lady Macbeth');
    expect(character.color).toBe(CHARACTER_COLORS[1]);
    expect(play.characters).toHaveLength(2);
  });

  it('recusa nome vazio', () => {
    expect(() => addCharacter(createPlay(), '   ')).toThrow(CharacterError);
  });

  it('recusa nome repetido, ignorando maiúsculas e acentos', () => {
    expect(() => addCharacter(playWith('Primeira Bruxa'), 'PRIMEIRA BRUXA')).toThrow(/Já existe/);
    expect(() => addCharacter(playWith('Mãe'), 'mae')).toThrow(/Já existe/);
  });

  it('não altera a peça original', () => {
    const original = createPlay();
    addCharacter(original, 'Banquo');
    expect(original.characters).toEqual([]);
  });
});

describe('renameCharacter', () => {
  it('renomeia mantendo o id, então as falas acompanham', () => {
    const base = playWith('Primeira Bruxa');
    const id = base.characters[0]!.id;
    const play = renameCharacter(withSpeeches(base, [id]), id, 'Bruxa 1');

    expect(play.characters[0]).toMatchObject({ id, name: 'Bruxa 1' });
    expect(countSpeeches(play).get(id)).toBe(1);
  });

  it('permite trocar só a caixa do próprio nome', () => {
    const play = playWith('macbeth');
    const id = play.characters[0]!.id;
    expect(renameCharacter(play, id, 'Macbeth').characters[0]!.name).toBe('Macbeth');
  });

  it('recusa nome de outro personagem', () => {
    const play = playWith('Macbeth', 'Banquo');
    expect(() => renameCharacter(play, play.characters[1]!.id, 'macbeth')).toThrow(/Já existe/);
  });
});

describe('removeCharacter', () => {
  it('remove quem não tem falas', () => {
    const play = playWith('Porteiro');
    expect(removeCharacter(play, play.characters[0]!.id).characters).toEqual([]);
  });

  it('recusa remover quem tem falas', () => {
    const base = playWith('Porteiro');
    const id = base.characters[0]!.id;
    expect(() => removeCharacter(withSpeeches(base, [id]), id)).toThrow(/ainda tem falas/);
  });
});

describe('findCharacterByName', () => {
  it('acha sem diferenciar acentos e maiúsculas', () => {
    const play = playWith('Duncan', 'Malcolm');
    expect(findCharacterByName(play, 'MALCOLM')?.name).toBe('Malcolm');
    expect(findCharacterByName(play, 'Fleance')).toBeUndefined();
  });
});

describe('suggestCharacters', () => {
  it('acha pelo começo de qualquer palavra do nome', () => {
    const play = playWith('Primeira Bruxa', 'Segunda Bruxa', 'Banquo', 'Macbeth');
    expect(suggestCharacters(play, 'bru').map((c) => c.name)).toEqual(['Primeira Bruxa', 'Segunda Bruxa']);
  });

  it('põe primeiro quem tem mais falas', () => {
    const base = playWith('Banquo', 'Bruxa');
    const [banquo, bruxa] = base.characters;
    const play = withSpeeches(base, [bruxa!.id, bruxa!.id, banquo!.id]);

    expect(suggestCharacters(play, 'b').map((c) => c.name)).toEqual(['Bruxa', 'Banquo']);
  });

  it('respeita o limite', () => {
    const play = playWith('A1', 'A2', 'A3');
    expect(suggestCharacters(play, 'a', 2)).toHaveLength(2);
  });
});
