import { createPlay, type Play } from '@macbeth/core';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

/** A peça aberta. O editor escreve aqui a cada alteração. */
export const usePlayStore = defineStore('play', () => {
  const play = shallowRef<Play>(createPlay());

  function replace(next: Play) {
    play.value = next;
  }

  return { play, replace };
});
