/*
 * Gera public/licenses.txt: todos os componentes de terceiros que vão junto
 * com o app, cada um com a licença e o texto que ela manda reproduzir.
 * A tela "Sobre" mostra esse arquivo.
 *
 * Entram as dependências de produção do JavaScript (pnpm) e, quando o Rust
 * está instalado, os crates da casca do desktop. O arquivo é gerado a cada
 * `dev` e `build` e não vai para o repositório.
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = join(web, '../desktop/src-tauri');
const output = join(web, 'public/licenses.txt');

/** Os arquivos de licença de um pacote: LICENSE, LICENSE-MIT, COPYING… */
function licenseTexts(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^(licen[cs]e|copying|notice)/i.test(name))
    .filter((name) => statSync(join(dir, name)).isFile())
    .sort()
    .map((name) => readFileSync(join(dir, name), 'utf8').trim());
}

function javascriptPackages() {
  const json = execSync('pnpm licenses list --prod --json', { cwd: web, encoding: 'utf8', maxBuffer: 64 << 20 });
  return Object.values(JSON.parse(json))
    .flat()
    .filter((pkg) => !pkg.name.startsWith('@macbeth/'))
    .map((pkg) => ({
      name: pkg.name,
      version: pkg.versions.join(', '),
      license: pkg.license,
      url: pkg.homepage,
      texts: licenseTexts(pkg.paths[0]),
    }));
}

/**
 * Crates que entram no executável deste sistema: as dependências normais a
 * partir do app, sem as de build, as de teste e as de outras plataformas.
 */
function rustCrates() {
  let json;
  try {
    const host = /^host: (.+)$/m.exec(execSync('rustc -vV', { encoding: 'utf8' }))[1];
    json = execSync(`cargo metadata --format-version 1 --locked --filter-platform ${host}`, {
      cwd: desktop,
      encoding: 'utf8',
      maxBuffer: 256 << 20,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    console.warn('licenses: Rust não encontrado; a lista sai sem os crates do desktop.');
    return [];
  }
  const meta = JSON.parse(json);
  const packages = new Map(meta.packages.map((p) => [p.id, p]));
  const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
  const root = meta.resolve.root;
  const seen = new Set([root]);
  const queue = [root];
  while (queue.length) {
    for (const dep of nodes.get(queue.shift()).deps) {
      const normal = dep.dep_kinds.some((k) => k.kind === null);
      if (normal && !seen.has(dep.pkg)) {
        seen.add(dep.pkg);
        queue.push(dep.pkg);
      }
    }
  }
  seen.delete(root);
  return [...seen].map((id) => {
    const p = packages.get(id);
    return {
      name: p.name,
      version: p.version,
      license: p.license ?? (p.license_file ? 'ver texto' : '?'),
      url: p.repository ?? p.homepage ?? `https://crates.io/crates/${p.name}`,
      texts: licenseTexts(dirname(p.manifest_path)),
    };
  });
}

/** Textos já escritos, para não repetir o mesmo (a Apache 2.0 vem igual em centenas de crates). */
const written = new Map();

function section(title, items) {
  items.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  const entries = items.map((item) => {
    const head = `${item.name} ${item.version}\n${item.license}${item.url ? `\n${item.url}` : ''}`;
    const texts = item.texts.map((text) => {
      const first = written.get(text);
      if (first) return `(mesmo texto de ${first})`;
      written.set(text, `${item.name} ${item.version}`);
      return text;
    });
    const body = texts.length ? texts.join('\n\n- - -\n\n') : '(o pacote não traz o texto da licença)';
    return `${'='.repeat(72)}\n${head}\n\n${body}`;
  });
  return `${title} (${items.length})\n\n${entries.join('\n\n')}`;
}

const rust = rustCrates();
const parts = [
  'Macbeth: componentes de terceiros / third-party components',
  section('JavaScript', javascriptPackages()),
];
if (rust.length) parts.push(section('Rust (desktop)', rust));
writeFileSync(output, `${parts.join('\n\n\n')}\n`);
