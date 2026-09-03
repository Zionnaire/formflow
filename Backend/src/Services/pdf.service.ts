import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { IFormTemplate } from '../Models/FormTemplate.model.js';
import type { ISubmission } from '../Models/Submission.model.js';

export interface MissingField {
  id: string;
  label: string;
  sectionId: string;
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
    const value = data[field.id];
    if (!value || field.type === 'stamp' || field.type === 'computed') continue;

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
