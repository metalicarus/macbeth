import { newId, type Id } from './ids';

/**
 * Versão do esquema do documento. Sobe quando o formato muda de um jeito
 * que versões antigas do app não conseguem ler.
 */
export const SCHEMA_VERSION = 1;

export interface TitlePage {
  title: string;
  author: string;
  subtitle?: string;
}

/** O personagem é um cadastro. As falas apontam para ele pelo id. */
export interface Character {
  id: Id;
  name: string;
  /** Cor de fita de marcação, usada na matriz, no ensaio e na planta baixa. */
  color: string;
  description?: string;
}

export interface StageDirection {
  id: Id;
  type: 'direction';
  text: string;
}

export interface Speech {
  id: Id;
  type: 'speech';
  characterId: Id;
  /** Indicação curta antes da fala, como "(baixo)" ou "(para Banquo)". */
  parenthetical?: string;
  text: string;
}

export type SceneElement = StageDirection | Speech;

export interface Scene {
  id: Id;
  title: string;
  place?: string;
  elements: SceneElement[];
}

export interface Act {
  id: Id;
  title: string;
  scenes: Scene[];
}

export interface Play {
  schemaVersion: number;
  titlePage: TitlePage;
  characters: Character[];
  acts: Act[];
}

export function createScene(title = 'Cena 1'): Scene {
  return { id: newId(), title, elements: [] };
}

export function createAct(title = 'Ato I'): Act {
  return { id: newId(), title, scenes: [createScene()] };
}

/** Peça nova: um ato com uma cena vazia, pronta para começar a escrever. */
export function createPlay(titlePage: Partial<TitlePage> = {}): Play {
  return {
    schemaVersion: SCHEMA_VERSION,
    titlePage: { title: '', author: '', ...titlePage },
    characters: [],
    acts: [createAct()],
  };
}
