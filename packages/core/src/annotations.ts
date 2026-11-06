import { newId } from './ids';
import type { Note, SceneElement, TextRange } from './model';

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
