import { addCharacter, createPlay, newId, type Play } from '@macbeth/core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { playToPdf, type FontFiles } from './pdf';

const require = createRequire(import.meta.url);
const font = (name: string) => readFileSync(require.resolve(`@fontsource/courier-prime/files/courier-prime-latin-${name}.woff`));
const fonts: FontFiles = {
  regular: font('400-normal'),
  bold: font('700-normal'),
  italic: font('400-italic'),
  boldItalic: font('700-italic'),
};
const labels = { continues: '(continua)', continued: '(cont.)' };

function sample(speeches: number): Play {
  const { play, character } = addCharacter(createPlay({ title: 'Macbeth', author: 'William Shakespeare' }), 'Macbeth');
  const act = play.acts[0]!;
  const elements = Array.from({ length: speeches }, () => ({
    id: newId(),
    type: 'speech' as const,
    characterId: character.id,
    text: 'Dia tão feio e tão belo eu nunca vi. Ação, coração, ¿qué?',
  }));
  return { ...play, acts: [{ ...act, scenes: [{ ...act.scenes[0]!, elements }] }] };
}

describe('playToPdf', () => {
  it('gera um PDF A4 com folha de rosto e metadados', async () => {
    const bytes = await playToPdf(sample(3), fonts, labels);
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(pdf.getTitle()).toBe('Macbeth');
    expect(pdf.getAuthor()).toBe('William Shakespeare');
  });

  it('peça longa ocupa várias páginas', async () => {
    const pdf = await PDFDocument.load(await playToPdf(sample(120), fonts, labels));
    expect(pdf.getPageCount()).toBeGreaterThan(5);
  });
});
