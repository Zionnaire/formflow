import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { IFormTemplate } from '../Models/FormTemplate.model.js';
import type { ISubmission } from '../Models/Submission.model.js';

export interface MissingField {
  id: string;
  label: string;
  sectionId: string;
}

/**
 * pdf-lib's StandardFonts only render WinAnsi (Windows-1252) — plain ASCII plus a specific set
 * of Latin-1/typographic characters. AI-drafted write-ups and copy-pasted text routinely contain
 * Unicode punctuation outside that set (non-breaking hyphens, various dash widths, smart quotes),
 * which otherwise throws and fails PDF generation outright (confirmed: a real submission's draft
 * text used U+2011 NON-BREAKING HYPHEN). Normalize the common cases to their ASCII equivalents,
 * then drop anything else pdf-lib still can't encode — covers WinAnsi's whole Latin-1 range, so
 * only genuinely exotic symbols (rare typographic marks, non-Latin scripts) are affected, and a
 * few missing symbols beat a 500 that blocks the student from generating their PDF at all.
 *
 * Every key/pattern below is written as a \u escape rather than a literal glyph — several of
 * these (the non-breaking hyphen and space especially) are visually identical to ASCII look-alikes
 * in an editor, which makes literal characters here a silent bug magnet.
 */
const WINANSI_PUNCTUATION_FALLBACKS: Record<string, string> = {
  '\u2010': '-', // hyphen
  '\u2011': '-', // non-breaking hyphen
  '\u2012': '-', // figure dash
  '\u2013': '-', // en dash
  '\u2014': '-', // em dash
  '\u2015': '-', // horizontal bar
  '\u2018': "'", // left single quote
  '\u2019': "'", // right single quote
  '\u201A': "'", // single low-9 quote
  '\u201C': '"', // left double quote
  '\u201D': '"', // right double quote
  '\u201E': '"', // double low-9 quote
  '\u2022': '-', // bullet
  '\u2026': '...', // ellipsis
  '\u00A0': ' ', // non-breaking space
};

const WINANSI_FALLBACK_PATTERN = /[\u2010-\u2015\u2018\u2019\u201A\u201C\u201D\u201E\u2022\u2026\u00A0]/g;

function sanitizeForPdf(text: string): string {
  const normalized = text.replace(WINANSI_FALLBACK_PATTERN, (ch) => WINANSI_PUNCTUATION_FALLBACKS[ch] ?? ch);
  // eslint-disable-next-line no-control-regex -- deliberately keeping only Latin-1, WinAnsi's encodable range
  return normalized.replace(/[^\x00-\xff]/g, '');
}

/** Flattens every section's data into a single fieldId -> value map. */
export function collectSubmissionData(submission: ISubmission): Record<string, string> {
  const data: Record<string, string> = {};
  for (const section of submission.sections.values()) {
    for (const [key, value] of Object.entries(section.data ?? {})) {
      if (typeof value === 'string' && value.trim()) data[key] = value;
    }
  }
  return data;
}

/** Deterministic presence check — no LLM call needed for "is this required field filled in". */
export function findMissingRequiredFields(template: IFormTemplate, submission: ISubmission): MissingField[] {
  const data = collectSubmissionData(submission);
  return template.fieldSchema
    .filter((f) => f.required && f.type !== 'stamp' && f.type !== 'computed' && !data[f.id]?.trim())
    .map((f) => ({ id: f.id, label: f.label, sectionId: f.sectionId }));
}

/**
 * Overlays filled values onto the original PDF using each field's fractional coordinates
 * (see Types/index.ts FieldCoordinates) converted to that page's actual point space.
 */
export async function fillPdf(originalBytes: Buffer, template: IFormTemplate, submission: ISubmission): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const data = collectSubmissionData(submission);
  const pages = pdfDoc.getPages();

  for (const field of template.fieldSchema) {
    const rawValue = data[field.id];
    if (!rawValue || field.type === 'stamp' || field.type === 'computed') continue;
    const value = sanitizeForPdf(rawValue);

    const page = pages[field.page - 1];
    if (!page) continue;

    const { width: pageWidth, height: pageHeight } = page.getSize();
    const boxX = field.coordinates.x * pageWidth;
    const boxTopY = field.coordinates.y * pageHeight;
    const boxWidth = field.coordinates.width * pageWidth;
    const boxHeight = field.coordinates.height * pageHeight;

    const isSignature = field.type === 'signature';
    const useFont = isSignature ? signatureFont : font;
    const targetSize = isSignature ? 18 : 11;
    const fontSize = Math.min(targetSize, Math.max(8, boxHeight * 0.7 || targetSize));

    if (field.type === 'long_text_ruled') {
      drawWrappedText(page, value, boxX, pageHeight - boxTopY, boxWidth || pageWidth - boxX, useFont, fontSize);
    } else {
      const drawY = pageHeight - boxTopY - fontSize;
      page.drawText(value, { x: boxX, y: drawY, size: fontSize, font: useFont, color: rgb(0.11, 0.11, 0.1) });
    }
  }

  // Classic xref table instead of pdf-lib's default xref *stream* — some parsers (including
  // this project's own pdf2json, used for extraction) reject the stream form it produces as
  // having an invalid header. Classic tables are the more broadly compatible choice anyway.
  return pdfDoc.save({ useObjectStreams: false });
}

function drawWrappedText(page: PDFPage, text: string, x: number, topY: number, maxWidth: number, font: PDFFont, fontSize: number): void {
  const lineHeight = fontSize * 1.4;
  const words = text.split(/\s+/);
  let line = '';
  let y = topY - fontSize;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      page.drawText(line, { x, y, size: fontSize, font, color: rgb(0.11, 0.11, 0.1) });
      line = word;
      y -= lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x, y, size: fontSize, font, color: rgb(0.11, 0.11, 0.1) });
  }
}
