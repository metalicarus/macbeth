import { newId, type Id } from './ids';
import type { Note, Play, SceneElement, TextRange } from './model';

/** Cortes em ordem, sem sobreposição e dentro do texto. */
export function normalizeCuts(cuts: readonly TextRange[], length: number): TextRange[] {
  const sorted = cuts
    .map((c) => ({ from: Math.max(0, Math.min(c.from, length)), to: Math.max(0, Math.min(c.to, length)) }))
    .filter((c) => c.to > c.from)
    .sort((a, b) => a.from - b.from);

  const merged: TextRange[] = [];
  for (const cut of sorted) {
    const last = merged.at(-1);
    if (last && cut.from <= last.to) last.to = Math.max(last.to, cut.to);
    else merged.push({ ...cut });
  }
  return merged;
}

/** O texto dividido em trechos mantidos e cortados, na ordem. */
export function splitByCuts(text: string, cuts: readonly TextRange[] = []): { text: string; cut: boolean }[] {
  const parts: { text: string; cut: boolean }[] = [];
  let at = 0;
  for (const { from, to } of normalizeCuts(cuts, text.length)) {
    if (from > at) parts.push({ text: text.slice(at, from), cut: false });
    parts.push({ text: text.slice(from, to), cut: true });
    at = to;
  }
  if (at < text.length || parts.length === 0) parts.push({ text: text.slice(at), cut: false });
  return parts;
}

/** O texto sem os trechos cortados. */
export function textWithoutCuts(text: string, cuts: readonly TextRange[] = []): string {
  return splitByCuts(text, cuts)
    .filter((p) => !p.cut)
    .map((p) => p.text)
    .join('');
}

/** A fala ou rubrica foi cortada inteira (só sobram espaços, se tanto). */
export function isFullyCut(element: SceneElement): boolean {
  if (!element.cuts?.length) return false;
  return textWithoutCuts(element.text, element.cuts).trim() === '';
}

export function createNote(text = ''): Note {
  return { id: newId(), text, createdAt: new Date().toISOString() };
}

export interface NoteEntry {
  note: Note;
  /** Número da nota na ordem da peça, a partir de 1 (o mesmo do alfinete na margem). */
  number: number;
  elementId: Id;
  /** Começo do trecho a que a nota pertence, para reconhecê-lo na lista. */
  excerpt: string;
}

const EXCERPT_LENGTH = 60;

function shorten(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…` : flat;
}

/** Todas as notas da peça, na ordem do texto, numeradas. */
export function listNotes(play: Play): NoteEntry[] {
  const names = new Map(play.characters.map((c) => [c.id, c.name]));
  const entries: NoteEntry[] = [];
  for (const act of play.acts) {
    for (const scene of act.scenes) {
      for (const element of scene.elements) {
        const excerpt =
          element.type === 'speech'
            ? `${(names.get(element.characterId) ?? '').toLocaleUpperCase('pt-BR')} – ${shorten(element.text)}`
            : `(${shorten(element.text)})`;
        for (const note of element.notes ?? []) {
          entries.push({ note, number: entries.length + 1, elementId: element.id, excerpt });
        }
      }
    }
  }
  return entries;
}

/** Acrescenta a palavra ao dicionário da peça, sem repetir; a lista fica em ordem alfabética. */
export function addToDictionary(play: Play, word: string): Play {
  const clean = word.trim();
  const current = play.dictionary ?? [];
  if (!clean || current.includes(clean)) return play;
  return { ...play, dictionary: [...current, clean].sort((a, b) => a.localeCompare(b)) };
}

export function removeFromDictionary(play: Play, word: string): Play {
  const current = play.dictionary ?? [];
  if (!current.includes(word)) return play;
  const dictionary = current.filter((w) => w !== word);
  if (dictionary.length > 0) return { ...play, dictionary };
  const { dictionary: _, ...rest } = play;
  return rest;
}
