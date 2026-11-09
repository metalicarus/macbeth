import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dictionaryFor } from './dictionaries';
import { SpellEngine } from './engine';
import { wordsIn } from './words';

const require = createRequire(import.meta.url);

/** Arquivos do dicionário direto do pacote, como o worker os recebe. */
function files(pkg: string): [Uint8Array, Uint8Array] {
  const dir = dirname(require.resolve(pkg));
  return [new Uint8Array(readFileSync(join(dir, 'index.aff'))), new Uint8Array(readFileSync(join(dir, 'index.dic')))];
}

describe('SpellEngine', () => {
  it('reconhece português, inclusive formas antigas, e aponta os erros', async () => {
    const engine = await SpellEngine.create(...files('dictionary-pt'));
    expect(engine.misspelled(['coração', 'dissestes', 'vede', 'charneca', 'corassão', 'feiu'])).toEqual(['corassão', 'feiu']);
    expect(engine.suggest('corassão')).toContain('coração');
    engine.dispose();
  });

  it('com o dicionário de espanhol, aceita espanhol e aponta português', async () => {
    const engine = await SpellEngine.create(...files('dictionary-es'));
    expect(engine.misspelled(['mañana', 'corazón', 'coração'])).toEqual(['coração']);
    engine.dispose();
  });

  it('aceita as palavras extras da peça', async () => {
    const engine = await SpellEngine.create(...files('dictionary-pt'), ['Glamis', 'Cawdor']);
    expect(engine.misspelled(['Glamis', 'Cawdor', 'Inverness'])).toEqual(['Inverness']);
    engine.add('Inverness');
    expect(engine.misspelled(['Inverness'])).toEqual([]);
    engine.dispose();
  });

  it('uma palavra tirada do dicionário da peça volta a ser marcada', async () => {
    const engine = await SpellEngine.create(...files('dictionary-pt'), ['Glamis', 'Cawdor']);
    engine.remove('Glamis');
    expect(engine.misspelled(['Glamis', 'Cawdor'])).toEqual(['Glamis']);
    engine.dispose();
  });
});

describe('dictionaryFor', () => {
  it('escolhe o dicionário pelo código exato ou pela língua base', () => {
    expect(dictionaryFor('pt-BR')?.id).toBe('pt-BR');
    expect(dictionaryFor('pt-PT')?.id).toBe('pt-PT');
    expect(dictionaryFor('pt')?.id).toBe('pt-BR');
    expect(dictionaryFor('en-GB')?.id).toBe('en');
    expect(dictionaryFor('es-AR')?.id).toBe('es');
    expect(dictionaryFor('de')).toBeNull();
  });
});

describe('wordsIn', () => {
  it('separa as palavras com acentos, apóstrofo e hífen, e diz onde estão', () => {
    expect(wordsIn("Dia tão feio, d'água e guarda-chuva!")).toEqual([
      { word: 'Dia', index: 0 },
      { word: 'tão', index: 4 },
      { word: 'feio', index: 8 },
      { word: "d'água", index: 14 },
      { word: 'e', index: 21 },
      { word: 'guarda-chuva', index: 23 },
    ]);
  });

  it('ignora números e palavras grudadas em algarismos', () => {
    expect(wordsIn('Ato 3, cena 1º e página A4').map((w) => w.word)).toEqual(['Ato', 'cena', 'e', 'página']);
  });
});
