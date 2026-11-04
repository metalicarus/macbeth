// O core não depende de DOM nem de Node; o crypto global existe nos dois ambientes.
declare const crypto: { randomUUID(): string };

export type Id = string;

export function newId(): Id {
  return crypto.randomUUID();
}
