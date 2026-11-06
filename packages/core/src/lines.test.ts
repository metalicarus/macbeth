import { describe, expect, it } from 'vitest';
import { classifyLine } from './lines';

describe('classifyLine', () => {
  it.each([
    'Ato I',
    'ATO II',
    'Ato 3',
    'Ato único',
    'ATO ÚNICO',
    'Segundo ato',
    'Ato IV – O banquete',
    'Act II',
    'Acto I',
    'Primer acto',
  ])('"%s" é ato', (line) => {
    expect(classifyLine(line)).toBe('act');
  });

  it.each(['Cena 1', 'CENA III', 'Cena 3 – Uma charneca', 'Cena única', 'Primeira cena', 'Scene 2', 'Escena 4', 'Segunda escena'])(
    '"%s" é cena',
    (line) => {
      expect(classifyLine(line)).toBe('scene');
    },
  );

  it.each(['MACBETH', 'LADY MACBETH', 'PRIMEIRA BRUXA', 'BRUXA 1', 'JOÃO', '  BANQUO  '])('"%s" é personagem', (line) => {
    expect(classifyLine(line)).toBe('character');
  });

  it.each([
    '',
    '   ',
    'Trovão. Entram as Bruxas.',
    'Ato contínuo, ele sai.',
    'Atônito, ele recua.',
    'Cenário vazio.',
    'BLACKOUT.',
    'SILÊNCIO!',
    'Macbeth',
    '123',
    'UM NOME DE PERSONAGEM COMPRIDO DEMAIS PARA SER UM NOME DE VERDADE',
  ])('"%s" continua rubrica', (line) => {
    expect(classifyLine(line)).toBeNull();
  });
});
