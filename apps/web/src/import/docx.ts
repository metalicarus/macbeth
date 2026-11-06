import type { ImportedParagraph } from '@macbeth/core';

/**
 * Parágrafos de um .docx. O mammoth (BSD) converte o documento em HTML
 * simples; daqui se tiram o texto e o itálico de cada parágrafo. Ele é
 * carregado só na hora de importar, para não pesar na abertura do app.
 *
 * Parágrafos vazios são mantidos: eles separam uma fala da rubrica seguinte.
 */
export async function docxParagraphs(bytes: Uint8Array): Promise<ImportedParagraph[]> {
  const { default: mammoth } = await import('mammoth');
  // No app (navegador e desktop) o mammoth lê um ArrayBuffer; nos testes, que
  // rodam no Node, a versão dele para o Node só aceita Buffer.
  const input =
    typeof Buffer === 'undefined'
      ? { arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer }
      : { buffer: Buffer.from(bytes) };
  const { value: html } = await mammoth.convertToHtml(input, { ignoreEmptyParagraphs: false });

  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return [...body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')].map((element) => ({
    text: element.textContent ?? '',
    italic: isAllItalic(element),
  }));
}

/** Todo o texto do parágrafo está dentro de <em>. */
function isAllItalic(element: Element): boolean {
  const text = (element.textContent ?? '').replace(/\s/g, '');
  if (!text) return false;
  const italic = [...element.querySelectorAll('em')].map((em) => em.textContent ?? '').join('').replace(/\s/g, '');
  return italic === text;
}
