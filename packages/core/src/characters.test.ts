import { describe, expect, it } from 'vitest';
import {
  addCharacter,
  CHARACTER_COLORS,
  CharacterError,
  charactersByAppearance,
  countSpeeches,
  findCharacterByName,
  removeCharacter,
  renameCharacter,
  setCharacterColor,
  setCharacterDescription,
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

  it('reaproveita a cor de um personagem removido', () => {
    const base = playWith('Macbeth', 'Banquo');
    const play = removeCharacter(base, base.characters[0]!.id);
    expect(addCharacter(play, 'Duncan').character.color).toBe(CHARACTER_COLORS[0]);
  });

  it('volta à primeira cor depois de usar todas', () => {
    const play = playWith(...CHARACTER_COLORS.map((_, i) => `P${i}`));
    expect(addCharacter(play, 'Extra').character.color).toBe(CHARACTER_COLORS[0]);
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

describe('setCharacterColor', () => {
  it('troca a cor só do personagem indicado', () => {
    const play = playWith('Macbeth', 'Banquo');
    const [macbeth, banquo] = play.characters;
    const result = setCharacterColor(play, macbeth!.id, '#7b5bd6');

    expect(result.characters[0]).toMatchObject({ id: macbeth!.id, color: '#7B5BD6' });
    expect(result.characters[1]).toEqual(banquo);
  });

  it('recusa cor fora do formato #RRGGBB', () => {
    const play = playWith('Macbeth');
    expect(() => setCharacterColor(play, play.characters[0]!.id, 'azul')).toThrow(CharacterError);
  });
});

describe('setCharacterDescription', () => {
  it('grava a descrição limpa e apaga quando fica vazia', () => {
    const base = playWith('Macbeth');
    const id = base.characters[0]!.id;

    const described = setCharacterDescription(base, id, '  general   do rei ');
    expect(described.characters[0]!.description).toBe('general do rei');

    const cleared = setCharacterDescription(described, id, '  ');
    expect(cleared.characters[0]).not.toHaveProperty('description');
  });
});

describe('charactersByAppearance', () => {
  it('ordena pela primeira fala; quem não fala vai para o fim, na ordem do cadastro', () => {
    const base = playWith('Duncan', 'Macbeth', 'Fleance', 'Bruxa');
    const [duncan, macbeth, fleance, bruxa] = base.characters.map((c) => c.id);
    const play = withSpeeches(base, [bruxa!, macbeth!, bruxa!, duncan!]);

    expect(charactersByAppearance(play).map((c) => c.id)).toEqual([bruxa, macbeth, duncan, fleance]);
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
