import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { IFormTemplate } from '../Models/FormTemplate.model.js';
import type { ISubmission } from '../Models/Submission.model.js';
import { extractPositionedText, type PositionedText } from './pdfText.service.js';

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
 * Draws text over an opaque white patch sized to it, instead of straight onto the page — the
 * source PDF's own pre-printed ruled lines sit at a pitch we can only estimate (ruledLineCount is
 * an AI guess, confirmed on a real form to be off by as much as 2x), so any fixed line spacing we
 * pick can drift into a ruled line crossing through the middle of our text instead of sitting
 * under it. Masking what's underneath first means that drift is merely invisible, not visible.
 */
function drawTextOpaque(page: PDFPage, text: string, x: number, y: number, size: number, font: PDFFont): void {
  const width = font.widthOfTextAtSize(text, size);
  const padding = size * 0.15;
  page.drawRectangle({
    x: x - padding,
    // Sized to the *assumed* lineHeight (fontSize * 1.4, see drawWrappedText), not just this
    // line's own ink extents — a mask sized only to the glyph height left enough margin that a
    // real printed rule could still show through near a line's descenders on longer wrapped
    // answers, confirmed on the real form's longest Section A responses.
    y: y - size * 0.5,
    width: width + padding * 2,
    height: size * 1.6,
    color: rgb(1, 1, 1),
  });
  page.drawText(text, { x, y, size, font, color: rgb(0.11, 0.11, 0.1) });
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

  // Only parsed when the template actually has a rating_grid field (most forms don't) — a second
  // full-document text-extraction pass, used to anchor each criterion row to its real printed
  // position instead of assuming the extracted box evenly spans exactly criteria.length rows.
  // Confirmed on the real reference form that assumption is false (see drawRatingGrid).
  const hasRatingGrid = template.fieldSchema.some((f) => f.type === 'rating_grid');
  const sourceText = hasRatingGrid ? (await extractPositionedText(originalBytes)).items : [];

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

    if (field.type === 'rating_grid') {
      // rawValue, not the sanitized `value` — this is a JSON control blob keyed by the field's own
      // criterion strings, never drawn as PDF text itself (only the literal ASCII "X" mark is
      // drawn), so it must stay byte-for-byte identical to field.gridCriteria for the lookup
      // below to match. Confirmed on the real reference form: sanitizeForPdf's curly-apostrophe
      // normalization silently rewrote a criterion key containing "organization's" (typographic
      // apostrophe) to a straight apostrophe, which no longer matched field.gridCriteria's own
      // (untouched) string — the mark was silently dropped instead of drawn.
      drawRatingGrid(
        page,
        rawValue,
        field.gridCriteria ?? [],
        field.gridOptions ?? [],
        boxX,
        pageHeight - boxTopY,
        boxWidth,
        boxHeight,
        font,
        sourceText,
        field.page,
        field.coordinates,
        field.gridCellOverrides,
      );
    } else if (field.type === 'long_text_ruled') {
      drawWrappedText(
        page,
        value,
        boxX,
        pageHeight - boxTopY,
        boxWidth || pageWidth - boxX,
        boxHeight,
        useFont,
        fontSize,
        field.detectedRuleYPositions,
        pageHeight,
      );
    } else {
      const drawY = pageHeight - boxTopY - fontSize;
      drawTextOpaque(page, value, boxX, drawY, fontSize, useFont);
    }
  }

  // Classic xref table instead of pdf-lib's default xref *stream* — some parsers (including
  // this project's own pdf2json, used for extraction) reject the stream form it produces as
  // having an invalid header. Classic tables are the more broadly compatible choice anyway.
  return pdfDoc.save({ useObjectStreams: false });
}

/**
 * Wraps text and picks one of two placement strategies. When rule-detection
 * (Services/ruleDetection.service.ts) found at least as many real printed rules as this box's own
 * height would plausibly hold, each wrapped line is anchored to a real rule instead of a guess.
 * Otherwise falls back to the previous lineHeight/masking approach — detection can legitimately
 * find zero or too few rules (a field whose printed area isn't ruled at all, a scan artifact, a
 * rule too faint to cross the brightness threshold), and an assumed spacing beats no text at all.
 */
function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  topY: number,
  maxWidth: number,
  maxHeight: number,
  font: PDFFont,
  fontSize: number,
  detectedRuleYPositions: number[] | undefined,
  pageHeight: number,
): void {
  const words = text.split(/\s+/);
  const assumedLineHeight = fontSize * 1.4;
  const plausibleLineCount = Math.max(1, Math.floor(maxHeight / assumedLineHeight));
  const rules = detectedRuleYPositions ? [...detectedRuleYPositions].sort((a, b) => a - b) : [];

  if (rules.length >= plausibleLineCount) {
    drawWrappedTextOnDetectedRules(page, words, x, maxWidth, font, fontSize, rules, pageHeight);
  } else {
    drawWrappedTextWithMasking(page, words, x, topY, maxWidth, maxHeight, font, fontSize);
  }
}

/**
 * Places each wrapped line's baseline just above its corresponding real printed rule (not an
 * assumed lineHeight) — detected by scanning pixels, not guessed. No opaque masking needed here:
 * the baseline sits above the rule by construction, so a printed rule can no longer cross through
 * the middle of the text the way an estimated lineHeight could. Runs out of real rules before it
 * runs out of words, it stops there — same bounded-truncation philosophy as the masking fallback,
 * rather than inventing a rule position beyond what was actually detected.
 */
function drawWrappedTextOnDetectedRules(
  page: PDFPage,
  words: string[],
  x: number,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
  ruleYFractions: number[],
  pageHeight: number,
): void {
  const baselineGap = fontSize * 0.2;
  let line = '';
  let ruleIndex = 0;

  function flush(): boolean {
    if (ruleIndex >= ruleYFractions.length) return false;
    const y = pageHeight - ruleYFractions[ruleIndex]! * pageHeight + baselineGap;
    page.drawText(line, { x, y, size: fontSize, font, color: rgb(0.11, 0.11, 0.1) });
    ruleIndex++;
    return true;
  }

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      if (!flush()) return;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) flush();
}

/**
 * Stops once it would run past maxHeight — an extraction-estimated box is sometimes taller than
 * the space really available before the next field's own label (confirmed on a real form: a short
 * comment still landed close to the field below it), so this bounds how far a *long* draft can
 * run on, even though it can't correct a box that was mis-measured from the very first line.
 *
 * The safety net for fields rule-detection couldn't confidently place — doesn't try to match line
 * spacing to the box's own pre-printed ruled lines (an assumed lineHeight can't be trusted for
 * that; see drawWrappedText), so drawTextOpaque masks whatever's underneath each line instead, so
 * a mismatched rule can no longer show through the middle of the text.
 */
function drawWrappedTextWithMasking(page: PDFPage, words: string[], x: number, topY: number, maxWidth: number, maxHeight: number, font: PDFFont, fontSize: number): void {
  const lineHeight = fontSize * 1.4;
  const bottomY = topY - Math.max(maxHeight, lineHeight);
  let line = '';
  let y = topY - fontSize;

  for (const word of words) {
    if (y < bottomY) return;
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      drawTextOpaque(page, line, x, y, fontSize, font);
      line = word;
      y -= lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line && y >= bottomY) {
    drawTextOpaque(page, line, x, y, fontSize, font);
  }
}

/**
 * Finds each criterion's real vertical position on the source page by matching it against the
 * page's own extracted text runs, instead of assuming the extracted box evenly spans exactly
 * criteria.length rows. Verified false on the real reference form: the `evaluation` field's box
 * (coordinates.y=0.25, height=0.3) measured against the page's actual text runs spans only six
 * real print-rows for seven criteria — "Attendance and punctuality"'s real text sits at y=0.2352,
 * *above* the box's own top edge (0.25) entirely. That's not a fixed off-by-one (a header row
 * wrongly included, say) that a divisor tweak could correct — it's a per-extraction sizing error,
 * and dividing box height by any constant can't place a mark for a row whose real content is
 * outside the box's bounds. Matching against real text sidesteps the box's vertical bounds for
 * row placement altogether; a criterion that fails to match (e.g. OCR-mangled text) falls back
 * to evenly dividing the field's own declared box, same as the old behavior, scoped to just that
 * row.
 *
 * Deliberately doesn't filter candidates by x — tried anchoring to the field's own x first and
 * verified it fails on a second real rating_grid on the same form (`assessment_grid`): its box is
 * anchored to the score column (x=0.25), while the criteria labels it names actually print in
 * their own column well to the left (x=0.126, outside any reasonable margin around the box's own
 * x). The box's x/width describe where its *answer* area is, not reliably where its row labels
 * are, so label column position can't be assumed from the field's own coordinates at all — a
 * generous page-relative y-window plus the text match's own specificity is what actually scopes
 * candidates correctly for both shapes of table.
 */
function resolveCriterionRowsY(
  criteria: string[],
  sourceText: PositionedText[],
  pageNumber: number,
  fieldTopY: number,
  fieldHeight: number,
): number[] {
  const candidates = sourceText
    .filter((item) => item.page === pageNumber && item.y >= fieldTopY - 0.12 && item.y <= fieldTopY + fieldHeight + 0.15)
    .sort((a, b) => a.y - b.y);

  const used = new Set<PositionedText>();

  return criteria.map((criterion, index) => {
    const normalized = criterion.trim().toLowerCase();
    const match = candidates.find((item) => {
      if (used.has(item)) return false;
      const itemText = item.text.trim().toLowerCase();
      // A criterion that wraps onto a second printed line is still two separate text runs —
      // matching on "one is a prefix of the other" catches both a whole-line match and just the
      // first fragment of a wrapped one.
      return itemText.length > 0 && (normalized.startsWith(itemText) || itemText.startsWith(normalized));
    });
    if (match) {
      used.add(match);
      return match.y;
    }
    return fieldTopY + (index + 0.5) * (fieldHeight / criteria.length);
  });
}

/**
 * Renders a rating_grid by marking the selected cell in each row, rather than dumping the
 * field's raw JSON value as text. A person can correct any individual cell's position via the
 * field-position editor (gridCellOverrides, checked first below) — that takes precedence over
 * this function's own computed position, which is otherwise a uniform-grid approximation for
 * columns (the box is assumed to span a label column plus one column per option, evenly divided —
 * verified against the real reference form to already land correctly) plus text-anchored rows
 * (see resolveCriterionRowsY).
 */
function drawRatingGrid(
  page: PDFPage,
  rawValue: string,
  criteria: string[],
  options: string[],
  boxX: number,
  boxTopY: number,
  boxWidth: number,
  boxHeight: number,
  font: PDFFont,
  sourceText: PositionedText[],
  pageNumber: number,
  fieldCoordinates: { x: number; y: number; height: number },
  gridCellOverrides: Record<string, Record<string, { x: number; y: number }>> | undefined,
): void {
  if (criteria.length === 0 || options.length === 0) return;
  let selections: Record<string, unknown>;
  try {
    selections = JSON.parse(rawValue) as Record<string, unknown>;
  } catch {
    return;
  }

  const { width: pageWidth, height: pageHeight } = page.getSize();
  const colWidth = boxWidth / (options.length + 1); // +1 for the criteria-label column
  const markSize = Math.min(boxHeight / criteria.length, colWidth) * 0.5;

  const rowsYFraction = resolveCriterionRowsY(criteria, sourceText, pageNumber, fieldCoordinates.y, fieldCoordinates.height);

  criteria.forEach((criterion, row) => {
    const selected = selections[criterion];
    if (typeof selected !== 'string' || !selected.trim()) return;
    const col = options.findIndex((opt) => opt.toLowerCase() === selected.toLowerCase());
    if (col === -1) return;

    const override = gridCellOverrides?.[criterion]?.[options[col]!];
    const cellCenterX = override ? override.x * pageWidth : boxX + (col + 1.5) * colWidth;
    const cellCenterY = override ? pageHeight - override.y * pageHeight : pageHeight - rowsYFraction[row]! * pageHeight;
    // drawText anchors at the text baseline, not its visual center — an "X" drawn at
    // cellCenterY would sit with its baseline there and its glyph extending upward, reading as
    // shifted a half-row too high. Offset by half the glyph's actual width/cap-height instead.
    const markFontSize = markSize * 1.5;
    const textWidth = font.widthOfTextAtSize('X', markFontSize);
    const capHeight = markFontSize * 0.72; // approx Helvetica cap height
    page.drawText('X', {
      x: cellCenterX - textWidth / 2,
      y: cellCenterY - capHeight / 2,
      size: markFontSize,
      font,
      color: rgb(0.11, 0.11, 0.1),
    });
  });
}
