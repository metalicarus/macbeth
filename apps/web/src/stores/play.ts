import { countSpeeches, createPlay, type Id, type Play } from '@macbeth/core';
import type { JSONContent } from '@tiptap/core';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { docToPlay } from '../editor/convert';

/** A peça aberta. O editor escreve aqui a cada alteração. */
export const usePlayStore = defineStore('play', () => {
  const play = shallowRef<Play>(createPlay());

  /*
   * Personagens que o editor cadastrou sozinho a partir do nome digitado na
   * fala. Enquanto se digita "Macbeth", passam por aqui "M", "Ma", "Mac"...;
   * os que ficam sem nenhuma fala são descartados. Quem já estava no cadastro
   * nunca é removido por este caminho.
   */
  const autoCreated = new Set<Id>();

  function replace(next: Play) {
    autoCreated.clear();
    play.value = next;
  }

  function applyDoc(doc: JSONContent) {
    let next = docToPlay(doc, play.value);

    // Descarta quem ficou sem fala ("M" quando já se lê "Ma") e converte de novo,
    // para que os nomes novos reaproveitem a cor liberada.
    const counts = countSpeeches(next);
    const discard = [...autoCreated].filter((id) => !counts.get(id));
    let base = play.value;
    if (discard.length > 0) {
      for (const id of discard) autoCreated.delete(id);
      base = { ...base, characters: base.characters.filter((c) => !discard.includes(c.id)) };
      next = docToPlay(doc, base);
    }

    const known = new Set(base.characters.map((c) => c.id));
    for (const c of next.characters) if (!known.has(c.id)) autoCreated.add(c.id);

    play.value = next;
  }

  return { play, replace, applyDoc };
});
