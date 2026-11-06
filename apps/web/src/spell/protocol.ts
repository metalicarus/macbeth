import type { DictionaryFiles } from './dictionaries';

/** Pedidos da janela para o worker do corretor. */
export type SpellRequest =
  /** Troca de dicionário (null: sem correção) e palavras extras da peça. */
  | { type: 'load'; dictionary: DictionaryFiles | null; words: string[] }
  /** Devolve, das palavras dadas, as erradas. */
  | { type: 'check'; words: string[] }
  | { type: 'suggest'; word: string }
  | { type: 'add'; word: string };

export interface SpellResponse {
  id: number;
  result?: boolean | string[];
  error?: string;
}
