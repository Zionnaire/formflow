import { PNG } from 'pngjs';

/** A field's coordinates already converted to pixel space on a specific rasterized page image. */
export interface PixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DARK_LUMINANCE_THRESHOLD = 150; // 0-255; a pixel this dark or darker counts as printed ink
const ROW_DARK_FRACTION = 0.5; // a row counts as a ruled line once at least half its width is ink
const MERGE_GAP_PX = 4; // a printed rule is a few px thick — collapse a run of dark rows into one

/**
 * Scans a field's pixel region on its rasterized page image row-by-row for horizontal runs of
 * consistently dark pixels — each qualifying row is a real printed rule, replacing the AI-guessed
 * `ruledLineCount` (confirmed on the real reference form to be off by as much as 2x, see
 * pdf.service.ts). Returns each rule's y position as a fraction of the page image's full height,
 * the same top-left-origin space FieldCoordinates already uses, so callers convert it exactly as
 * they already convert `coordinates.y`.
 *
 * Pure-JS PNG decode deliberately, not @napi-rs/canvas — the native module reliably crashes the
 * whole process when invoked in-process (see pdfRenderWorker.ts's child-process isolation); this
 * runs on every long_text_ruled field at template-creation time, in-process, so it can't carry
 * that same risk.
 */
export function detectRuledLines(pngBuffer: Buffer, box: PixelBox): number[] {
  const png = PNG.sync.read(pngBuffer);
  const { data, width, height } = png;

  const x0 = Math.max(0, Math.round(box.x));
  const x1 = Math.min(width, Math.round(box.x + box.width));
  const y0 = Math.max(0, Math.round(box.y));
  const y1 = Math.min(height, Math.round(box.y + box.height));
  if (x1 <= x0 || y1 <= y0) return [];

  const rowSpan = x1 - x0;
  const darkRows: number[] = [];

  for (let y = y0; y < y1; y++) {
    let darkCount = 0;
    for (let x = x0; x < x1; x++) {
      const idx = (width * y + x) * 4;
      const luminance = 0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;
      if (luminance < DARK_LUMINANCE_THRESHOLD) darkCount++;
    }
    if (darkCount / rowSpan >= ROW_DARK_FRACTION) darkRows.push(y);
  }

  // Collapse each run of consecutive/near-consecutive dark rows into a single detected rule,
  // keeping the run's last (lowest) row — the rule's visual bottom edge, which is where text
  // conventionally rests just above on ruled paper.
  const merged: number[] = [];
  let runActive = false;
  let previous = -Infinity;
  for (const y of darkRows) {
    if (y - previous > MERGE_GAP_PX && runActive) merged.push(previous);
    runActive = true;
    previous = y;
  }
  if (runActive) merged.push(previous);

  return merged.map((y) => y / height);
}
