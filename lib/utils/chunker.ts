export interface TextChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
}

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

export function chunkText(
  pages: { pageNumber: number; text: string }[]
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    if (text.length <= CHUNK_SIZE) {
      chunks.push({
        text,
        pageNumber: page.pageNumber,
        chunkIndex: globalIndex++,
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      let end = start + CHUNK_SIZE;

      if (end < text.length) {
        const lastPeriod = text.lastIndexOf(".", end);
        const lastNewline = text.lastIndexOf("\n", end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        if (breakPoint > start + CHUNK_SIZE / 2) {
          end = breakPoint + 1;
        }
      } else {
        end = text.length;
      }

      chunks.push({
        text: text.slice(start, end).trim(),
        pageNumber: page.pageNumber,
        chunkIndex: globalIndex++,
      });

      start = end - CHUNK_OVERLAP;
      if (start < 0) start = 0;
      if (end >= text.length) break;
    }
  }

  return chunks;
}
