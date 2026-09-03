import PDFParser from 'pdf2json';

export interface PositionedText {
  page: number;
  text: string;
  /** Fraction of page width/height (0-1), origin top-left — matches Types/index.ts FieldCoordinates. */
  x: number;
  y: number;
}

interface Pdf2JsonTextRun {
  T: string;
}

interface Pdf2JsonTextBlock {
  x: number;
  y: number;
  R: Pdf2JsonTextRun[];
}

interface Pdf2JsonPage {
  Width: number;
  Height: number;
  Texts: Pdf2JsonTextBlock[];
}

interface Pdf2JsonOutput {
  Pages: Pdf2JsonPage[];
}

/**
 * Extracts every text run with its position, normalized to a 0-1 fraction of that page's
 * width/height (top-left origin) — the same coordinate space Groq is asked to reason in and
 * Services/pdf.service.ts converts back from when filling the PDF.
 */
export async function extractPositionedText(pdfBytes: Buffer): Promise<{ pageCount: number; items: PositionedText[] }> {
  const data = await new Promise<Pdf2JsonOutput>((resolve, reject) => {
    const parser = new PDFParser();
    parser.on('pdfParser_dataError', (err: Error | { parserError: Error }) => reject('parserError' in err ? err.parserError : err));
    parser.on('pdfParser_dataReady', (pdfData: unknown) => resolve(pdfData as Pdf2JsonOutput));
    parser.parseBuffer(pdfBytes);
  });

  const items: PositionedText[] = [];
  data.Pages.forEach((page, pageIndex) => {
    for (const block of page.Texts) {
      const text = block.R.map((run) => decodeText(run.T)).join('').trim();
      if (!text) continue;
      items.push({
        page: pageIndex + 1,
        text,
        x: page.Width > 0 ? block.x / page.Width : 0,
        y: page.Height > 0 ? block.y / page.Height : 0,
      });
    }
  });

  return { pageCount: data.Pages.length, items };
}

function decodeText(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
