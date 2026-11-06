import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { wordsIn } from '../spell/words';

/*
 * Sublinha as palavras erradas, segundo o corretor do Macbeth (e não o do
 * sistema, que fica desligado no editor). Depois de uma pausa na digitação,
 * junta as palavras do texto, pergunta ao corretor só pelas que ainda não
 * conhece e redesenha os sublinhados.
 *
 * O nome do personagem não é verificado; nomes de personagens são aceitos
 * em qualquer lugar (inclusive em maiúsculas numa rubrica).
 */

export interface SpellCheckOptions {
  /** Das palavras dadas, as erradas (o corretor responde de forma assíncrona). */
  misspelled: (words: string[]) => Promise<string[]>;
  /** Palavras aceitas sem perguntar ao corretor (nomes de personagens, "ignorar"). */
  isAccepted: (word: string) => boolean;
  /** Pausa na digitação antes de verificar, em milissegundos. */
  delay: number;
}

interface SpellState {
  /** Resposta do corretor por palavra: true se está certa. */
  known: Map<string, boolean>;
  decorations: DecorationSet;
  /**
   * Sobe a cada recomeço (outro dicionário). Respostas pedidas antes do
   * recomeço chegam com a geração antiga e são descartadas.
   */
  generation: number;
}

type SpellMeta =
  | { type: 'answers'; answers: Map<string, boolean>; generation: number }
  | { type: 'reset' }
  | { type: 'redraw' };

export const spellCheckKey = new PluginKey<SpellState>('spellCheck');

/** Pede ao corretor que recomece: outro dicionário ou palavras novas no dicionário da peça. */
export function resetSpellCheck(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(spellCheckKey, { type: 'reset' } satisfies SpellMeta).setMeta('addToHistory', false));
}

/** Redesenha os sublinhados (ex.: a lista de nomes aceitos mudou). */
export function redrawSpellCheck(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(spellCheckKey, { type: 'redraw' } satisfies SpellMeta).setMeta('addToHistory', false));
}

/** Cada trecho de texto verificável e onde ele começa no documento. */
function checkableTexts(doc: PMNode): { text: string; start: number }[] {
  const texts: { text: string; start: number }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (node.type.name !== 'speechCue') {
      // A quebra de verso vira "\n" (1 caractere), então a posição no texto é a do documento.
      texts.push({ text: node.textBetween(0, node.content.size, undefined, '\n'), start: pos + 1 });
    }
    return false;
  });
  return texts;
}

function buildDecorations(doc: PMNode, known: Map<string, boolean>, isAccepted: (word: string) => boolean): DecorationSet {
  const decorations: Decoration[] = [];
  for (const { text, start } of checkableTexts(doc)) {
    for (const { word, index } of wordsIn(text)) {
      if (known.get(word) === false && !isAccepted(word)) {
        decorations.push(Decoration.inline(start + index, start + index + word.length, { class: 'misspelled' }));
      }
    }
  }
  return DecorationSet.create(doc, decorations);
}

export const SpellCheck = Extension.create<SpellCheckOptions>({
  name: 'spellCheck',

  addOptions() {
    return { misspelled: async () => [], isAccepted: () => false, delay: 400 };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<SpellState>({
        key: spellCheckKey,

        state: {
          init: () => ({ known: new Map(), decorations: DecorationSet.empty, generation: 0 }),
          apply(tr: Transaction, previous: SpellState, _old: EditorState, state: EditorState): SpellState {
            const meta = tr.getMeta(spellCheckKey) as SpellMeta | undefined;
            if (meta?.type === 'reset') {
              return { known: new Map(), decorations: DecorationSet.empty, generation: previous.generation + 1 };
            }
            if (meta?.type === 'answers') {
              if (meta.generation !== previous.generation) return previous;
              const known = new Map([...previous.known, ...meta.answers]);
              return { ...previous, known, decorations: buildDecorations(state.doc, known, options.isAccepted) };
            }
            if (meta?.type === 'redraw') {
              return { ...previous, decorations: buildDecorations(state.doc, previous.known, options.isAccepted) };
            }
            // Enquanto se digita, os sublinhados acompanham o texto até a próxima verificação.
            return tr.docChanged ? { ...previous, decorations: previous.decorations.map(tr.mapping, tr.doc) } : previous;
          },
        },

        props: {
          decorations: (state) => spellCheckKey.getState(state)?.decorations,
        },

        view: (view) => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          let destroyed = false;

          const check = async () => {
            const { known, generation } = spellCheckKey.getState(view.state)!;
            const unknown = new Set<string>();
            for (const { text } of checkableTexts(view.state.doc)) {
              for (const { word } of wordsIn(text)) if (!known.has(word)) unknown.add(word);
            }
            const words = [...unknown];
            const wrong = new Set(words.length ? await options.misspelled(words) : []);
            if (destroyed) return;
            const answers = new Map(words.map((word) => [word, !wrong.has(word)]));
            view.dispatch(
              view.state.tr
                .setMeta(spellCheckKey, { type: 'answers', answers, generation } satisfies SpellMeta)
                .setMeta('addToHistory', false),
            );
          };

          const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(() => void check(), options.delay);
          };
          schedule();

          return {
            update: (_view, previousState) => {
              const restarted = spellCheckKey.getState(view.state)!.generation !== spellCheckKey.getState(previousState)!.generation;
              if (view.state.doc !== previousState.doc || restarted) schedule();
            },
            destroy: () => {
              destroyed = true;
              clearTimeout(timer);
            },
          };
        },
      }),
    ];
  },
});
