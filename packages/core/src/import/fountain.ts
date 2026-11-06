import { classifyLine } from '../lines';
import type { Play } from '../model';
import { PlayBuilder } from './builder';

/*
 * Leitor de Fountain (fountain.io), o formato de texto simples dos roteiros,
 * adaptado ao teatro:
 *
 *   Title: / Author:                    → folha de rosto
 *   # Ato I  /  ## Cena 1               → ato / cena (seções)
 *   INT. CASA - NOITE  /  .CENA         → cena (cabeçalho, ou forçado com ".")
 *   Ato II / Cena 3 (como ação)         → ato / cena, como no editor
 *   NOME (ou @Nome) e diálogo abaixo    → fala; "(baixo)" logo abaixo do
 *                                          nome vira parentético
 *   > centralizado <, transições, ação   → rubrica
 *   [[notas]], /* comentários *\/, ===    → ignorados
 *
 * Linhas de ação seguidas viram uma rubrica só. Linhas de diálogo seguidas
 * viram linhas da mesma fala (versos).
 */

const TITLE_KEY = /^([A-Za-z][A-Za-z ]*):\s*(.*)$/;
const SCENE_HEADING = /^(?:INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i;
const FORCED_SCENE = /^\.(?!\.)\s*(.*)$/;
const SECTION = /^(#+)\s*(.*)$/;
const CENTERED = /^>\s*(.*?)\s*<$/;
const TRANSITION = /^(?:>\s*(.*)|([\p{Lu}\s]+TO:))$/u;
const PARENTHETICAL = /^\((.*)\)$/;
const CHARACTER_EXTENSION = /\s*\([^)]*\)\s*$/;

function stripMarkup(source: string): string {
  return source
    .replace(/\r\n?/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\[\[[\s\S]*?\]\]/g, '');
}

/** Nome do personagem numa linha de deixa, ou null se a linha não é uma deixa. */
function characterName(line: string): string | null {
  if (line.startsWith('@')) return line.slice(1).replace(CHARACTER_EXTENSION, '').replace(/\^$/, '').trim() || null;
  const name = line.replace(/\^$/, '').replace(CHARACTER_EXTENSION, '').trim();
  return name && classifyLine(name) === 'character' ? name : null;
}

export function fountainToPlay(source: string): Play {
  const builder = new PlayBuilder();
  const lines = stripMarkup(source).split('\n');
  let i = 0;

  // Folha de título: pares "Chave: valor" no começo, até a primeira linha vazia.
  if (TITLE_KEY.test(lines[0] ?? '')) {
    let key = '';
    const values: Record<string, string[]> = {};
    for (; i < lines.length && lines[i]!.trim() !== ''; i++) {
      const line = lines[i]!;
      const pair = /^\s/.test(line) ? null : TITLE_KEY.exec(line);
      if (pair) {
        key = pair[1]!.toLowerCase();
        values[key] = pair[2] ? [pair[2].trim()] : [];
      } else if (key) {
        values[key]!.push(line.trim());
      }
    }
    const join = (k: string) => (values[k] ?? []).join(' ').trim();
    builder.titlePage({ title: join('title'), author: join('author') || join('authors') });
  }

  let previousBlank = true;
  for (; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) {
      previousBlank = true;
      continue;
    }
    const startsBlock = previousBlank;
    previousBlank = false;

    if (/^={3,}$/.test(line) || /^=(?!=)/.test(line)) continue;

    const section = SECTION.exec(line);
    if (section) {
      if (section[1]!.length === 1) builder.act(section[2]!);
      else if (section[1]!.length === 2) builder.scene(section[2]!);
      continue;
    }

    const forced = FORCED_SCENE.exec(line);
    if (startsBlock && (forced || SCENE_HEADING.test(line))) {
      builder.scene(forced ? forced[1]! : line);
      continue;
    }

    const centered = CENTERED.exec(line);
    if (centered) {
      builder.direction(centered[1]!);
      continue;
    }

    const next = lines[i + 1]?.trim() ?? '';
    const name = startsBlock && next ? characterName(line) : null;
    if (name) {
      builder.speech(name, '');
      // Diálogo: as linhas seguintes até a próxima linha vazia.
      for (i++; i < lines.length && lines[i]!.trim() !== ''; i++) {
        const dialogue = lines[i]!.trim().replace(/^~\s*/, '');
        const parenthetical = PARENTHETICAL.exec(dialogue);
        if (!(parenthetical && builder.setParenthetical(parenthetical[1]!.trim()))) builder.continueSpeech(dialogue);
      }
      previousBlank = true;
      continue;
    }

    const transition = TRANSITION.exec(line);
    if (transition) {
      builder.direction((transition[1] ?? transition[2])!.trim());
      continue;
    }

    const action = line.replace(/^!/, '');
    const kind = classifyLine(action);
    if (kind === 'act') {
      builder.act(action);
      continue;
    }
    if (kind === 'scene') {
      builder.scene(action);
      continue;
    }

    // Linhas de ação seguidas formam uma rubrica só.
    const block = [action];
    while (i + 1 < lines.length && lines[i + 1]!.trim() !== '') block.push(lines[++i]!.trim().replace(/^!/, ''));
    builder.direction(block.join(' '));
  }

  return builder.build();
}
