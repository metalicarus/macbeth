import { locate, type Id } from '@macbeth/core';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { usePlayStore } from './play';

/*
 * Ponte entre o editor e as visões da estrutura (lateral, tabela): o editor
 * informa onde está o cursor, e as visões pedem para ir a um elemento sem
 * precisar conhecer o editor.
 */
export const useNavigation = defineStore('navigation', () => {
  const play = usePlayStore();

  /** Elemento onde está o cursor, informado pelo editor. */
  const cursorElementId = ref<Id | null>(null);
  /** Ato e cena onde está o cursor. */
  const current = computed(() => (cursorElementId.value ? locate(play.play, cursorElementId.value) : null));

  /** Pedido de navegação; o número muda a cada pedido, mesmo para o mesmo id. */
  const request = shallowRef<{ id: Id; seq: number } | null>(null);
  let seq = 0;

  function goTo(id: Id) {
    request.value = { id, seq: ++seq };
  }

  return { cursorElementId, current, request, goTo };
});
