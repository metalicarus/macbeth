import boldItalicUrl from '@fontsource/courier-prime/files/courier-prime-latin-700-italic.woff?url';
import boldUrl from '@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff?url';
import italicUrl from '@fontsource/courier-prime/files/courier-prime-latin-400-italic.woff?url';
import regularUrl from '@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff?url';
import type { FontFiles } from './pdf';

// WOFF, não WOFF2: o fontkit do pdf-lib falha ao recortar fontes WOFF2.
const load = async (url: string) => (await fetch(url)).arrayBuffer();

let cached: Promise<FontFiles> | null = null;

/** As quatro variações da Courier Prime, carregadas uma vez só. */
export function scriptFonts(): Promise<FontFiles> {
  cached ??= Promise.all([load(regularUrl), load(boldUrl), load(italicUrl), load(boldItalicUrl)]).then(
    ([regular, bold, italic, boldItalic]) => ({ regular, bold, italic, boldItalic }),
  );
  return cached;
}
