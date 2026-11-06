/** Uma palavra do texto e onde ela está. */
export interface WordAt {
  word: string;
  /** Posição do primeiro caractere dentro do texto. */
  index: number;
}

// Letras (com acentos) e apóstrofo ou hífen entre letras: "d'água", "guarda-chuva".
// Palavras grudadas em algarismos não entram ("1º", "A4").
const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

/** As palavras do texto, para o corretor. */
export function wordsIn(text: string): WordAt[] {
  const words: WordAt[] = [];
  for (const match of text.matchAll(WORD)) {
    const before = text[match.index - 1];
    const after = text[match.index + match[0].length];
    if ((before && /\d/.test(before)) || (after && /\d/.test(after))) continue;
    words.push({ word: match[0], index: match.index });
  }
  return words;
}
