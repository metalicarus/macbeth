import { layoutPlay, playLanguage, type LayoutOptions, type Play, type Span } from '@macbeth/core';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';

/*
 * Desenha no PDF as páginas montadas por layoutPlay (core). Aqui só se
 * convertem linhas e caracteres em pontos: as regras de página ficam no core.
 *
 * A4, margens de 2,5 cm e Courier Prime 12 pt com 12 pt entre linhas, o
 * padrão de 6 linhas por polegada dos roteiros.
 */

export interface FontFiles {
  regular: ArrayBuffer | Uint8Array;
  bold: ArrayBuffer | Uint8Array;
  italic: ArrayBuffer | Uint8Array;
  boldItalic: ArrayBuffer | Uint8Array;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 72;
const FONT_SIZE = 12;
const LEADING = 12;
const INK = rgb(0.08, 0.08, 0.1);

/**
 * `cuts`: 'omit' gera a versão do espetáculo (sem os trechos cortados);
 * 'strike', a cópia da direção, com os cortes riscados.
 */
export async function playToPdf(
  play: Play,
  fonts: FontFiles,
  labels: LayoutOptions['labels'],
  cuts: LayoutOptions['cuts'] = 'omit',
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const embed = (bytes: ArrayBuffer | Uint8Array) => doc.embedFont(bytes, { subset: true });
  const font = {
    regular: await embed(fonts.regular),
    bold: await embed(fonts.bold),
    italic: await embed(fonts.italic),
    boldItalic: await embed(fonts.boldItalic),
  };
  const fontFor = (span: Span): PDFFont =>
    span.bold ? (span.italic ? font.boldItalic : font.bold) : span.italic ? font.italic : font.regular;

  // Fonte monoespaçada: todo caractere tem a mesma largura.
  const charWidth = font.regular.widthOfTextAtSize('M', FONT_SIZE);
  const textWidth = PAGE_WIDTH - 2 * MARGIN;
  const pages = layoutPlay(play, {
    charsPerLine: Math.floor(textWidth / charWidth),
    linesPerPage: Math.floor((PAGE_HEIGHT - 2 * MARGIN) / LEADING),
    labels,
    cuts,
  });

  for (const laidOut of pages) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    if (laidOut.number !== null) {
      const label = `${laidOut.number}.`;
      const width = font.regular.widthOfTextAtSize(label, FONT_SIZE);
      page.drawText(label, { x: PAGE_WIDTH - MARGIN - width, y: PAGE_HEIGHT - MARGIN / 2, size: FONT_SIZE, font: font.regular, color: INK });
    }

    laidOut.lines.forEach((line, i) => {
      const length = line.spans.reduce((sum, s) => sum + s.text.length, 0);
      let x = MARGIN + (line.align === 'center' ? (textWidth - length * charWidth) / 2 : (line.indent ?? 0) * charWidth);
      const y = PAGE_HEIGHT - MARGIN - (i + 1) * LEADING;
      for (const span of line.spans) {
        page.drawText(span.text, { x, y, size: FONT_SIZE, font: fontFor(span), color: INK });
        const width = span.text.length * charWidth;
        if (span.struck && span.text.trim()) {
          // Risco só sobre o texto (não sobre os espaços das pontas), na altura
          // do meio das letras minúsculas.
          const start = x + (span.text.length - span.text.trimStart().length) * charWidth;
          const end = x + span.text.trimEnd().length * charWidth;
          const middle = y + FONT_SIZE * 0.28;
          page.drawLine({ start: { x: start, y: middle }, end: { x: end, y: middle }, thickness: 0.9, color: INK });
        }
        x += width;
      }
    });
  }

  doc.setTitle(play.titlePage.title || 'Macbeth');
  if (play.titlePage.author) doc.setAuthor(play.titlePage.author);
  doc.setLanguage(playLanguage(play));
  doc.setCreator('Macbeth');
  doc.setProducer('Macbeth');
  return doc.save();
}
