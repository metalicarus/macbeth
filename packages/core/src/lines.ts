/*
 * Reconhece o que uma linha de texto simples é, nas convenções do Fountain.
 * O editor usa isto no Enter de uma rubrica, e a importação de .docx, .odt
 * e Fountain usa para achar atos, cenas e nomes de personagem.
 *
 *   "Ato II", "ATO ÚNICO", "Segundo ato"    → ato
 *   "Cena 3 – Uma charneca"                 → cena
 *   "MACBETH" (maiúsculas, sem pontuação)   → fala desse personagem
 *
 * Ato e cena exigem um número, algarismo romano ou ordinal logo depois da
 * palavra, para que uma rubrica como "Ato contínuo, ele sai." não vire ato.
 * Os padrões aceitam português, inglês e espanhol.
 */

export type LineKind = 'act' | 'scene' | 'character';

const NUMBER = String.raw`(?:\d+|[ivxlcdm]+|[uú]nic[oa]|one|two|three|four|five|uno|dos|tres|cuatro|cinco)`;
const ORDINAL =
  '(?:primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|quint[oa]|first|second|third|fourth|fifth|primer[oa]?|tercer[oa]?)';

const ACT = new RegExp(String.raw`^(?:(?:ato|act|acto)\s+${NUMBER}|${ORDINAL}\s+(?:ato|act|acto))(?=$|[\s.:–—-])`, 'iu');
const SCENE = new RegExp(String.raw`^(?:(?:cena|scene|escena)\s+${NUMBER}|${ORDINAL}\s+(?:cena|scene|escena))(?=$|[\s.:–—-])`, 'iu');

const MAX_CHARACTER_NAME = 40;

export function classifyLine(raw: string): LineKind | null {
  const text = raw.trim();
  if (!text) return null;
  if (ACT.test(text)) return 'act';
  if (SCENE.test(text)) return 'scene';
  if (isCharacterName(text)) return 'character';
  return null;
}

function isCharacterName(text: string): boolean {
  if (text.length > MAX_CHARACTER_NAME) return false;
  if (!/\p{L}/u.test(text)) return false;
  if (text !== text.toLocaleUpperCase('pt-BR')) return false;
  // Uma frase em maiúsculas com ponto final ("BLACKOUT.") é rubrica, não nome.
  return !/[.!?:;,…)]$/u.test(text);
}
