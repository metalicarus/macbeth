import { normalizeName, type Character } from '@macbeth/core';
import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { enter, tab } from './keymap';

/*
 * Sugestões de personagem enquanto se digita o nome na fala. A lista vem de
 * fora (`suggest`), para que o editor não dependa de onde está a peça.
 *
 *   ↑ ↓     escolhem
 *   Enter   aceita e vai para o texto da fala
 *   Tab     aceita e vai para o parentético
 *   Esc     fecha até o nome mudar
 */

export interface CueSuggestState {
  open: boolean;
  items: Character[];
  index: number;
  /** Posição do começo do nome no documento, para posicionar a lista. */
  from: number;
}

export interface CueSuggestStorage {
  state: CueSuggestState;
  /** Nome que o usuário fechou com Esc; a lista volta quando o nome mudar. */
  dismissed: string | null;
}

export interface CueSuggestOptions {
  suggest: (query: string) => Character[];
  onChange: (state: CueSuggestState) => void;
}

declare module '@tiptap/core' {
  interface Storage {
    cueSuggest: CueSuggestStorage;
  }
}

const CLOSED: CueSuggestState = { open: false, items: [], index: 0, from: 0 };

export const CueSuggest = Extension.create<CueSuggestOptions, CueSuggestStorage>({
  name: 'cueSuggest',
  // Antes do PlayKeymap, para que Enter e Tab aceitem a sugestão primeiro.
  priority: 1100,

  addOptions() {
    return { suggest: () => [], onChange: () => {} };
  },

  addStorage() {
    return { state: CLOSED, dismissed: null };
  },

  addKeyboardShortcuts() {
    const storage = this.storage;
    const move = (delta: number) => () => {
      const { state } = storage;
      if (!state.open) return false;
      setState(this, { ...state, index: (state.index + delta + state.items.length) % state.items.length });
      return true;
    };
    const acceptWith = (then: 'line' | 'parenthetical') => () =>
      storage.state.open && acceptCueSuggestion(this.editor, storage.state.index, then);

    return {
      ArrowDown: move(1),
      ArrowUp: move(-1),
      Enter: acceptWith('line'),
      Tab: acceptWith('parenthetical'),
      Escape: () => {
        if (!storage.state.open) return false;
        storage.dismissed = currentQuery(this.editor);
        setState(this, CLOSED);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    let lastQuery: string | null = null;
    return [
      new Plugin({
        key: new PluginKey('cueSuggest'),
        view: () => ({
          update: () => {
            const query = currentQuery(this.editor);
            if (query !== this.storage.dismissed) this.storage.dismissed = null;

            if (query === null || !query.trim() || query === this.storage.dismissed) {
              lastQuery = query;
              if (this.storage.state.open) setState(this, CLOSED);
              return;
            }

            const items = this.options.suggest(query);
            const onlyExact = items.length === 1 && normalizeName(items[0]!.name) === normalizeName(query);
            const index = query === lastQuery ? Math.min(this.storage.state.index, Math.max(items.length - 1, 0)) : 0;
            lastQuery = query;

            const from = this.editor.state.selection.$from.start();
            setState(this, items.length === 0 || onlyExact ? CLOSED : { open: true, items, index, from });
          },
        }),
      }),
    ];
  },
});

function currentQuery(editor: Editor): string | null {
  const { selection } = editor.state;
  const $from = selection.$from;
  if (!selection.empty || $from.parent.type.name !== 'speechCue') return null;
  return $from.parent.textContent;
}

function setState(ext: { storage: CueSuggestStorage; options: CueSuggestOptions }, state: CueSuggestState): void {
  ext.storage.state = state;
  ext.options.onChange(state);
}

/** Aceita a sugestão `index`: preenche o nome, liga o personagem e segue para o texto ou o parentético. */
export function acceptCueSuggestion(editor: Editor, index: number, then: 'line' | 'parenthetical' = 'line'): boolean {
  const character = editor.storage.cueSuggest.state.items[index];
  const $from = editor.state.selection.$from;
  if (!character || $from.parent.type.name !== 'speechCue') return false;

  const { schema, tr } = editor.state;
  tr.replaceWith($from.start(), $from.end(), schema.text(character.name));
  tr.setNodeAttribute($from.before(), 'characterId', character.id);
  editor.view.dispatch(tr);

  const next = then === 'line' ? enter : tab;
  next(editor.state, editor.view.dispatch);
  return true;
}
