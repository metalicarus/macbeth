import { loadModule } from '@farscrl/hunspell-wasm';

/*
 * O corretor: o Hunspell (o mesmo do LibreOffice) compilado para
 * WebAssembly, com um dicionário por vez. Roda dentro do worker
 * (spell.worker.ts); aqui não há nada de navegador, para poder testar no Node.
 */

type Factory = Awaited<ReturnType<typeof loadModule>>;
type Hunspell = ReturnType<Factory['create']>;

let factory: Promise<Factory> | null = null;

export class SpellEngine {
  private constructor(
    private readonly hunspell: Hunspell,
    private readonly mounted: string[],
    private readonly fs: Factory,
  ) {}

  /** Carrega o dicionário (.aff e .dic) e acrescenta as palavras extras (as da peça). */
  static async create(aff: Uint8Array, dic: Uint8Array, extraWords: readonly string[] = []): Promise<SpellEngine> {
    factory ??= loadModule();
    const fs = await factory;
    const id = Math.random().toString(36).slice(2);
    const affPath = fs.mountBuffer(aff, `${id}.aff`);
    const dicPath = fs.mountBuffer(dic, `${id}.dic`);
    const engine = new SpellEngine(fs.create(affPath, dicPath), [affPath, dicPath], fs);
    for (const word of extraWords) engine.add(word);
    return engine;
  }

  /** Das palavras dadas, as que o dicionário não reconhece. */
  misspelled(words: readonly string[]): string[] {
    return words.filter((word) => !this.hunspell.spell(word));
  }

  suggest(word: string, limit = 6): string[] {
    return this.hunspell.suggest(word).slice(0, limit);
  }

  add(word: string): void {
    this.hunspell.addWord(word);
  }

  dispose(): void {
    this.hunspell.dispose();
    for (const path of this.mounted) this.fs.unmount(path);
  }
}
