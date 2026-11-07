export type AnswerBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

/** A small text-only format: paragraphs, lists and emphasis; no HTML or arbitrary links. */
export function answerBlocks(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  // Older replies join several unit rows with semicolons. Keep every word, split the rows.
  const normalized = text.replace(/\r\n?/g, '\n').replace(/;\s+(?=[A-Z][A-Z0-9]*-\d+:)/g, '\n');
  for (const raw of normalized.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^(?:[-*•]|\d+[.)])\s+(.+)$/.exec(line);
    const legacyUnit = /^[A-Z][A-Z0-9]*-\d+:/.test(line);
    if (bullet || legacyUnit) {
      const item = bullet?.[1] || line;
      const last = blocks.at(-1);
      if (last?.kind === 'list') last.items.push(item); else blocks.push({ kind: 'list', items: [item] });
    } else blocks.push({ kind: 'paragraph', text: line.replace(/^#{1,6}\s+/, '') });
  }
  return blocks;
}

export const sourceHref = (id: string) => id.startsWith('LI-') ? `/supervisor/laporan/${encodeURIComponent(id)}` : `/supervisor/work-order?wo=${encodeURIComponent(id)}`;

/** Exact IDs only: never turn an invented or partial ID into a source link. */
export function answerParts(text: string, sources: string[]) {
  return text.split(/(\*\*[^*\n]+\*\*|\b(?:LI|WO)-[A-Za-z0-9-]+\b)/g).filter(Boolean).map(part => {
    if (part.startsWith('**') && part.endsWith('**')) return { kind: 'strong' as const, text: part.slice(2, -2) };
    const index = sources.indexOf(part);
    return index >= 0 ? { kind: 'source' as const, text: part, index } : { kind: 'text' as const, text: part };
  });
}
