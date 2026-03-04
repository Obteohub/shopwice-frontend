const HTML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

export function decodeHtmlEntities(input: unknown): string {
  const value = typeof input === 'string' ? input : '';
  if (!value || value.indexOf('&') === -1) return value;

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, (match, entity) => {
    const normalized = String(entity);
    const lowered = normalized.toLowerCase();

    if (HTML_NAMED_ENTITIES[lowered]) {
      return HTML_NAMED_ENTITIES[lowered];
    }

    if (lowered.startsWith('#x')) {
      const codePoint = Number.parseInt(lowered.slice(2), 16);
      if (Number.isFinite(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }

    if (lowered.startsWith('#')) {
      const codePoint = Number.parseInt(lowered.slice(1), 10);
      if (Number.isFinite(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }

    return match;
  });
}

