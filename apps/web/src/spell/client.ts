import { dictionaryFor } from './dictionaries';
import type { SpellRequest, SpellResponse } from './protocol';

/**
 * Lado da janela do corretor: conversa com o worker e devolve promessas.
 * Um só worker para o app inteiro.
 */
export class SpellClient {
  private worker: Worker | null = null;
  private next = 0;
  private pending = new Map<number, { resolve: (value: SpellResponse['result']) => void; reject: (error: Error) => void }>();

  private send(request: SpellRequest): Promise<SpellResponse['result']> {
    this.worker ??= this.start();
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, request });
    });
  }

  private start(): Worker {
    const worker = new Worker(new URL('./spell.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<SpellResponse>) => {
      const waiting = this.pending.get(event.data.id);
      if (!waiting) return;
      this.pending.delete(event.data.id);
      if (event.data.error) waiting.reject(new Error(event.data.error));
      else waiting.resolve(event.data.result);
    };
    return worker;
  }

  /**
   * Prepara o corretor para o idioma da peça, com as palavras do dicionário
   * dela. Devolve false quando não há dicionário para esse idioma.
   */
  async setLanguage(language: string, words: readonly string[]): Promise<boolean> {
    const dictionary = dictionaryFor(language);
    await this.send({ type: 'load', dictionary, words: [...words] });
    return dictionary !== null;
  }

  async misspelled(words: readonly string[]): Promise<string[]> {
    return (await this.send({ type: 'check', words: [...words] })) as string[];
  }

  async suggest(word: string): Promise<string[]> {
    return (await this.send({ type: 'suggest', word })) as string[];
  }

  async add(word: string): Promise<void> {
    await this.send({ type: 'add', word });
  }
}

export const spellClient = new SpellClient();
