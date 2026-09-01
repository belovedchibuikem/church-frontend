export function bibleChapterPath(book: string, chapter: number, verse?: number, version?: string): string {
  const params = new URLSearchParams();
  if (version) params.set('v', version);
  const query = params.toString();
  const hash = verse ? `#v${verse}` : '';
  return `/bible/${book}/${chapter}${query ? `?${query}` : ''}${hash}`;
}

export function bookAbbrev(book: { id: string; slug: string; abbrev?: string }): string {
  return (book.abbrev || book.id || book.slug.slice(0, 3)).toUpperCase();
}
