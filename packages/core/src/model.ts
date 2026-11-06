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
  /**
   * Língua em que a peça está escrita (código BCP 47, como "pt-BR" ou "es").
   * Vale para o corretor ortográfico e para pôr nomes em maiúsculas. Ausente
   * em arquivos antigos: nesse caso, português do Brasil.
   */
  language?: string;
}

export const DEFAULT_PLAY_LANGUAGE = 'pt-BR';

/** Línguas oferecidas no painel; o arquivo aceita qualquer código BCP 47. */
export const PLAY_LANGUAGES = ['pt-BR', 'pt-PT', 'es', 'en', 'fr', 'it', 'de'] as const;

export function playLanguage(play: Play): string {
  return play.titlePage.language || DEFAULT_PLAY_LANGUAGE;
}

/** O personagem é um cadastro. As falas apontam para ele pelo id. */
export interface Character {
  id: Id;
  name: string;
  /** Cor de fita de marcação, usada na matriz, no ensaio e na planta baixa. */
  color: string;
  description?: string;
}

/**
 * Trecho cortado do texto de uma fala ou rubrica: posições de caracteres,
 * do início (inclusive) ao fim (exclusive). O texto continua guardado; o
 * corte só o esconde do PDF e, se a pessoa quiser, da tela.
 */
export interface TextRange {
  from: number;
  to: number;
}

/** Nota pessoal presa a uma fala ou rubrica. */
export interface Note {
  id: Id;
  text: string;
  /** Data de criação, em ISO 8601. */
  createdAt: string;
  resolved?: boolean;
}

/** Camadas por cima do texto, que nunca o alteram. */
interface Annotated {
  cuts?: TextRange[];
  notes?: Note[];
}

export interface StageDirection extends Annotated {
  id: Id;
  type: 'direction';
  text: string;
}

export interface Speech extends Annotated {
  id: Id;
  type: 'speech';
  characterId: Id;
  /** Indicação curta antes da fala, como "(baixo)" ou "(para Banquo)". */
  parenthetical?: string;
  /** Os cortes (`cuts`) valem sobre este texto. */
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
  /**
   * Palavras que o corretor deve aceitar nesta peça (nomes, termos antigos,
   * invenções do autor). Vão junto com o arquivo, para quem o abrir.
   */
  dictionary?: string[];
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
