import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/**
 * Arquivos .mbth que o sistema pediu para abrir (duplo clique, "Abrir com"),
 * recebidos pela casca do desktop (src-tauri/src/lib.rs). Pedidos que
 * chegaram antes da janela ficam numa fila lá e são buscados aqui. Com
 * vários de uma vez, abre o último: o app tem uma peça por vez.
 * Devolve a função que para de escutar.
 */
export async function onOpenRequests(open: (path: string) => Promise<void>): Promise<() => void> {
  if (!isTauri()) return () => {};
  let queue = Promise.resolve();
  const take = () => {
    queue = queue.then(async () => {
      const path = (await invoke<string[]>('take_requested_files')).at(-1);
      if (path) await open(path);
    });
  };
  const unlisten = await listen('open-requested', take);
  take();
  return unlisten;
}
