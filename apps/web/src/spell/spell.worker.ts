/// <reference lib="webworker" />
import { SpellEngine } from './engine';
import type { SpellRequest, SpellResponse } from './protocol';

/*
 * O corretor roda aqui, fora da janela, para que carregar o dicionário e
 * verificar uma peça longa não travem a digitação.
 */

let engine: SpellEngine | null = null;
let loadedId: string | null = null;

async function bytes(url: string): Promise<Uint8Array> {
  return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

async function handle(request: SpellRequest): Promise<SpellResponse['result']> {
  switch (request.type) {
    case 'load': {
      if (request.dictionary === null) {
        engine?.dispose();
        engine = null;
        loadedId = null;
        return true;
      }
      if (loadedId !== request.dictionary.id) {
        const [aff, dic] = await Promise.all([bytes(request.dictionary.aff), bytes(request.dictionary.dic)]);
        engine?.dispose();
        engine = await SpellEngine.create(aff, dic);
        loadedId = request.dictionary.id;
      }
      for (const word of request.words) engine!.add(word);
      return true;
    }
    case 'check':
      return engine ? engine.misspelled(request.words) : [];
    case 'suggest':
      return engine ? engine.suggest(request.word) : [];
    case 'add':
      engine?.add(request.word);
      return true;
  }
}

self.onmessage = async (event: MessageEvent<{ id: number; request: SpellRequest }>) => {
  const { id, request } = event.data;
  try {
    self.postMessage({ id, result: await handle(request) } satisfies SpellResponse);
  } catch (error) {
    self.postMessage({ id, error: String(error) } satisfies SpellResponse);
  }
};
