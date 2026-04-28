export function countWords(markdown: string): number {
  // Strip code fences + frontmatter-like blocks, then count whitespace-separated tokens.
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~\-]/g, ' ');
  const tokens = stripped.split(/\s+/).filter(Boolean);
  return tokens.length;
}

export function readMinutes(words: number, wpm = 230): number {
  return Math.max(1, Math.round(words / wpm));
}
