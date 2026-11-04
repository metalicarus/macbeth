import { newId, type Id } from './ids';
import type { Character, Play } from './model';

/** Cores das fitas de marcação de palco. Cada personagem novo recebe a próxima. */
export const CHARACTER_COLORS = [
  '#D64541',
  '#2F80ED',
  '#27AE60',
  '#E2B100',
  '#C2409B',
  '#E07B2A',
  '#1AA6B7',
  '#7B5BD6',
] as const;

export class CharacterError extends Error {
  constructor(
    readonly code: 'empty-name' | 'duplicate-name' | 'not-found' | 'has-speeches',
    message: string,
  ) {
    super(message);
    this.name = 'CharacterError';
  }
}

/** Compara nomes sem diferenciar maiúsculas, acentos e espaços repetidos. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanName(name: string): string {
  const cleaned = name.replace(/\s+/g, ' ').trim();
  if (!cleaned) throw new CharacterError('empty-name', 'O nome do personagem não pode ficar vazio.');
  return cleaned;
}

function assertUniqueName(play: Play, name: string, exceptId?: Id): void {
  const wanted = normalizeName(name);
  const clash = play.characters.find((c) => c.id !== exceptId && normalizeName(c.name) === wanted);
  if (clash) throw new CharacterError('duplicate-name', `Já existe um personagem chamado "${clash.name}".`);
}

export function findCharacter(play: Play, id: Id): Character | undefined {
  return play.characters.find((c) => c.id === id);
}

export function findCharacterByName(play: Play, name: string): Character | undefined {
  const wanted = normalizeName(name);
  return play.characters.find((c) => normalizeName(c.name) === wanted);
}

export function addCharacter(play: Play, name: string): { play: Play; character: Character } {
  const cleaned = cleanName(name);
  assertUniqueName(play, cleaned);
  const character: Character = {
    id: newId(),
    name: cleaned,
    color: CHARACTER_COLORS[play.characters.length % CHARACTER_COLORS.length]!,
  };
  return { play: { ...play, characters: [...play.characters, character] }, character };
}

/** Como as falas apontam para o id, renomear aqui muda a peça inteira. */
export function renameCharacter(play: Play, id: Id, name: string): Play {
  if (!findCharacter(play, id)) throw new CharacterError('not-found', 'Personagem não encontrado.');
  const cleaned = cleanName(name);
  assertUniqueName(play, cleaned, id);
  return {
    ...play,
    characters: play.characters.map((c) => (c.id === id ? { ...c, name: cleaned } : c)),
  };
}

/** Só remove personagens sem falas, para nunca deixar uma fala sem dono. */
export function removeCharacter(play: Play, id: Id): Play {
  if (!findCharacter(play, id)) throw new CharacterError('not-found', 'Personagem não encontrado.');
  if ((countSpeeches(play).get(id) ?? 0) > 0) {
    throw new CharacterError('has-speeches', 'O personagem ainda tem falas na peça.');
  }
  return { ...play, characters: play.characters.filter((c) => c.id !== id) };
}

export function countSpeeches(play: Play): Map<Id, number> {
  const counts = new Map<Id, number>(play.characters.map((c) => [c.id, 0]));
  for (const act of play.acts) {
    for (const scene of act.scenes) {
      for (const element of scene.elements) {
        if (element.type === 'speech') {
          counts.set(element.characterId, (counts.get(element.characterId) ?? 0) + 1);
        }
      }
    }
  }
  return counts;
}

/**
 * Sugestões para o campo Personagem enquanto se digita. Aceita o começo do
 * nome ou de qualquer palavra dele ("bru" acha "Primeira Bruxa"); quem tem
 * mais falas aparece primeiro.
 */
export function suggestCharacters(play: Play, query: string, limit = 5): Character[] {
  const q = normalizeName(query);
  const counts = countSpeeches(play);
  return play.characters
    .filter((c) => {
      const name = normalizeName(c.name);
      return name.startsWith(q) || name.split(' ').some((word) => word.startsWith(q));
    })
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, limit);
}
