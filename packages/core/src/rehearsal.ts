import { isFullyCut, textWithoutCuts } from './annotations';
import type { Id } from './ids';
import type { Play } from './model';

/*
 * Roteiro para o modo Ensaiar: a peça vista por um personagem. O texto é o
 * da versão do espetáculo (sem os trechos cortados). As falas dele aparecem
 * escondidas até o ator conferir; a deixa (o fim da fala anterior) fica
 * destacada.
 */

export type RehearsalLine =
  | { kind: 'scene'; id: Id; act: string; title: string }
  | { kind: 'direction'; id: Id; text: string }
  | {
      kind: 'speech';
      id: Id;
      characterId: Id;
      speaker: string;
      color: string;
      parenthetical?: string;
      text: string;
      /** A fala é do personagem que está ensaiando. */
      mine: boolean;
      /**
       * A fala vem logo antes de uma fala do ator: é onde está a deixa.
       * `cueStart` é onde a deixa começa dentro do texto (0 = a fala inteira).
       */
      cueStart?: number;
    };

export type CueMode = 'words' | 'speech';

export interface RehearsalOptions {
  characterId: Id;
  /** Uma cena (pelo id) ou a peça inteira. */
  sceneId: Id | null;
  /** Deixa: as últimas palavras ou a fala anterior inteira. */
  cue: CueMode;
}

const CUE_WORDS = 8;

/**
 * Onde começa a deixa no texto: as últimas palavras (até 8) ou, se for
 * mais curta, a última frase inteira.
 */
export function cueStart(text: string, maxWords = CUE_WORDS): number {
  const trimmed = text.trimEnd();
  // Começo da última frase: depois do último ponto final, de exclamação ou de interrogação que não esteja no fim.
  let sentence = 0;
  for (const match of trimmed.matchAll(/[.!?…]+["'»)]*\s+/g)) {
    if (match.index + match[0].length < trimmed.length) sentence = match.index + match[0].length;
  }
  // Começo das últimas `maxWords` palavras.
  const starts = [...trimmed.matchAll(/\S+/g)].map((m) => m.index);
  const words = starts.length > maxWords ? starts[starts.length - maxWords]! : 0;
  return Math.max(sentence, words);
}

/** "Dia tão feio" → "D__ t__ f___": a primeira letra de cada palavra, pontuação mantida. */
export function initials(text: string): string {
  return text.replace(/([\p{L}\p{N}])([\p{L}\p{M}\p{N}'’-]*)/gu, (_, first: string, rest: string) => first + '_'.repeat(rest.length));
}

/** Cenas em que o personagem fala (fora as cortadas inteiras), na ordem da peça. */
export function scenesWithCharacter(play: Play, characterId: Id): { id: Id; act: string; title: string }[] {
  return play.acts.flatMap((act) =>
    act.scenes
      .filter((scene) =>
        scene.elements.some((e) => e.type === 'speech' && e.characterId === characterId && !isFullyCut(e)),
      )
      .map((scene) => ({ id: scene.id, act: act.title, title: scene.title })),
  );
}

type SpeechLine = Extract<RehearsalLine, { kind: 'speech' }>;

function lastSpeechInScene(lines: RehearsalLine[]): SpeechLine | undefined {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (line.kind === 'scene') return undefined;
    if (line.kind === 'speech') return line;
  }
  return undefined;
}

export function rehearsalScript(play: Play, options: RehearsalOptions): RehearsalLine[] {
  const characters = new Map(play.characters.map((c) => [c.id, c]));
  const lines: RehearsalLine[] = [];

  for (const act of play.acts) {
    for (const scene of act.scenes) {
      if (options.sceneId && scene.id !== options.sceneId) continue;
      lines.push({ kind: 'scene', id: scene.id, act: act.title, title: scene.title });

      for (const element of scene.elements) {
        if (isFullyCut(element)) continue;
        const text = textWithoutCuts(element.text, element.cuts).replace(/[ \t]+/g, ' ').trim();
        if (element.type === 'direction') {
          lines.push({ kind: 'direction', id: element.id, text });
          continue;
        }
        const character = characters.get(element.characterId);
        const mine = element.characterId === options.characterId;
        // A última fala antes desta (pulando rubricas, sem sair da cena) carrega a
        // deixa, se for de outro personagem.
        if (mine) {
          const previous = lastSpeechInScene(lines);
          if (previous && !previous.mine) previous.cueStart = options.cue === 'speech' ? 0 : cueStart(previous.text);
        }
        lines.push({
          kind: 'speech',
          id: element.id,
          characterId: element.characterId,
          speaker: character?.name ?? '',
          color: character?.color ?? '#888888',
          ...(element.parenthetical ? { parenthetical: element.parenthetical } : {}),
          text,
          mine,
        });
      }
    }
  }
  return lines;
}
