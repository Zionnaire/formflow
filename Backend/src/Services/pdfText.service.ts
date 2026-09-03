import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/** The subset of pdf.js's TextItem this file actually reads — its own type isn't a named export of the package root. */
interface PdfJsTextItem {
  str: string;
  transform: number[];
}

export interface PositionedText {
  page: number;
  text: string;
  /** Fraction of page width/height (0-1), origin top-left — matches Types/index.ts FieldCoordinates. */
  x: number;
  y: number;
}

/**
 * Extracts every text run with its position, normalized to a 0-1 fraction of that page's
 * width/height (top-left origin) — the same coordinate space Groq is asked to reason in and
 * Services/pdf.service.ts converts back from when filling the PDF.
 *
 * Uses the real, actively-maintained pdf.js rather than a parser fork (pdf2json) — the fork
 * silently returned zero text items for professionally-designed PDFs with embedded/subsetted
 * fonts (confirmed against a real form: pdf-lib saw 13 pages, pdf2json extracted 0 text runs
 * from any of them, pdfjs-dist extracted 308). Pinned to 5.4.296 — the last release still
 * declaring Node 20 support; 5.6+ requires Node 22.
 */
export async function extractPositionedText(pdfBytes: Buffer): Promise<{ pageCount: number; items: PositionedText[] }> {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const items: PositionedText[] = [];

  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      for (const entry of content.items) {
        if (!('str' in entry)) continue; // TextMarkedContent — not actual text
        const item = entry as PdfJsTextItem;
        const text = item.str.trim();
        if (!text) continue;

        // transform is always [scaleX, skewX, skewY, scaleY, translateX, translateY] per the PDF spec.
        const x = item.transform[4]!;
        const y = item.transform[5]!;
        items.push({
          page: pageNum,
          text,
          x: viewport.width > 0 ? x / viewport.width : 0,
          y: viewport.height > 0 ? (viewport.height - y) / viewport.height : 0,
        });
      }

      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  return { pageCount: doc.numPages, items };
}
