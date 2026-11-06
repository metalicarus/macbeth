import { normalizeName } from '../characters';
import { classifyLine } from '../lines';
import type { Play } from '../model';
import { PlayBuilder } from './builder';

/*
 * Reconhece a peça num texto que veio de um processador de texto (.docx,
 * .odt), parágrafo por parágrafo:
 *
 *   ATO I / Cena 2 – Inverness            → ato / cena
 *   MACBETH – texto  (ou ":" ou ". ")      → fala, formato Em linha
 *   MACBETH – (baixo) texto                → fala com parentético
 *   MACBETH  (sozinho na linha)            → fala, formato Centralizado:
 *     (baixo)                                 o parentético e o texto vêm
 *     texto                                   nos parágrafos seguintes
 *   (Entram as Bruxas.)  ou itálico        → rubrica
 *   parágrafo comum logo depois da fala    → continua a fala (versos)
 *   parágrafo comum depois de linha vazia  → rubrica
 *   PERSONAGENS / ELENCO, e a lista abaixo → cadastro, com descrição
 *
 * Para evitar falsos positivos, "NOME. texto" e "Nome: texto" (sem
 * maiúsculas) só contam como fala quando o nome aparece pelo menos duas
 * vezes no texto.
 */

export interface ImportedParagraph {
  text: string;
  /** O parágrafo inteiro está em itálico. */
  italic?: boolean;
}

const MAX_NAME = 40;
const UPPER_NAME = String.raw`\p{Lu}[\p{Lu}\p{M}\d '’-]*[\p{Lu}\p{M}\d]`;
const INLINE_UPPER = new RegExp(String.raw`^(${UPPER_NAME})\s*(?:([–—:])|\s-\s|(\.)\s)\s*(.*)$`, 'u');
const INLINE_MIXED = /^(\p{Lu}[\p{L}\p{M}'’-]*(?: [\p{L}\p{M}'’-]+){0,3}):\s*(.*)$/u;
const CUE_WITH_PARENTHETICAL = new RegExp(String.raw`^(${UPPER_NAME})\s*\(([^)]*)\)$`, 'u');
const WHOLE_PARENS = /^\((.*)\)$/su;
const LEADING_PARENS = /^\(([^)]*)\)\s*(.*)$/su;
const CAST_HEADING = /^(personagens|elenco|dramatis person(?:ae|æ)|characters|cast|personajes|reparto)\s*:?$/iu;
const CAST_ENTRY = /^([^,–—:]+?)\s*(?:[,–—:]|\s-\s)\s*(.*)$/u;

interface InlineSpeech {
  name: string;
  text: string;
  /** Formas que só valem se o nome se repetir no texto. */
  weak: boolean;
}

function inlineSpeech(text: string): InlineSpeech | null {
  const upper = INLINE_UPPER.exec(text);
  if (upper && upper[1]!.length >= 2 && upper[1]!.length <= MAX_NAME) {
    return { name: upper[1]!.trim(), text: upper[4]!, weak: !upper[2] && Boolean(upper[3]) };
  }
  const mixed = INLINE_MIXED.exec(text);
  if (mixed && mixed[1]!.length <= MAX_NAME) return { name: mixed[1]!, text: mixed[2]!, weak: true };
  return null;
}

/** Quantas vezes cada nome aparece como falante, para validar as formas fracas. */
function speakerCounts(paragraphs: ImportedParagraph[]): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (name: string) => counts.set(normalizeName(name), (counts.get(normalizeName(name)) ?? 0) + 1);
  for (const { text } of paragraphs) {
    const line = text.trim();
    const inline = inlineSpeech(line);
    if (inline) bump(inline.name);
    else if (classifyLine(line) === 'character') bump(line);
    else {
      const cue = CUE_WITH_PARENTHETICAL.exec(line);
      if (cue) bump(cue[1]!);
    }
  }
  return counts;
}

export function paragraphsToPlay(paragraphs: ImportedParagraph[]): Play {
  const builder = new PlayBuilder();
  const counts = speakerCounts(paragraphs);
  let inCast = false;
  let castEntries = 0;
  // A última coisa foi uma fala e não houve linha vazia depois dela.
  let speaking = false;

  const clean = (p: ImportedParagraph | undefined) => (p?.text ?? '').replace(/\s+/g, ' ').trim();

  paragraphs.forEach((paragraph, i) => {
    const text = clean(paragraph);
    // No formato Centralizado a fala vem no parágrafo seguinte, sem linha vazia.
    const next = clean(paragraphs[i + 1]);
    const followedBySpeech = next !== '' && classifyLine(next) === null;

    if (!text) {
      speaking = false;
      if (inCast && castEntries > 0) inCast = false;
      return;
    }

    const kind = classifyLine(text);
    if (kind === 'act' || kind === 'scene') {
      inCast = false;
      speaking = false;
      if (kind === 'act') builder.act(text);
      else builder.scene(text);
      return;
    }

    if (CAST_HEADING.test(text)) {
      inCast = true;
      castEntries = 0;
      return;
    }

    const parens = WHOLE_PARENS.exec(text);

    if (inCast && !parens) {
      const entry = CAST_ENTRY.exec(text);
      const name = (entry ? entry[1]! : text).trim();
      if (name.length <= MAX_NAME) {
        builder.character(name, entry?.[2]?.trim() || undefined);
        castEntries++;
        return;
      }
    }
    inCast = false;

    if (parens) {
      // Logo depois de um nome sozinho na linha, é o parentético da fala.
      if (!(speaking && builder.setParenthetical(parens[1]!.trim()))) {
        builder.direction(parens[1]!.trim());
        speaking = false;
      }
      return;
    }

    if (paragraph.italic) {
      builder.direction(text);
      speaking = false;
      return;
    }

    const inline = inlineSpeech(text);
    if (inline && (!inline.weak || (counts.get(normalizeName(inline.name)) ?? 0) >= 2)) {
      const lead = LEADING_PARENS.exec(inline.text);
      if (lead) builder.speech(inline.name, lead[2]!, lead[1]!.trim());
      else builder.speech(inline.name, inline.text);
      speaking = true;
      return;
    }

    // "FIM", "CORTINA", "BLACKOUT" sozinhos não são personagens: falta a fala logo abaixo.
    if (kind === 'character' && followedBySpeech) {
      builder.speech(text, '');
      speaking = true;
      return;
    }

    const cue = CUE_WITH_PARENTHETICAL.exec(text);
    if (cue && followedBySpeech) {
      builder.speech(cue[1]!, '', cue[2]!.trim());
      speaking = true;
      return;
    }

    if (speaking && builder.continueSpeech(text)) return;
    builder.direction(text);
    speaking = false;
  });

  return builder.build();
}
