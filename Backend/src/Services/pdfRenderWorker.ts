/**
 * Standalone worker script — NOT imported by the app, only ever run as a child process by
 * pdfRender.service.ts. Rendering a PDF page touches @napi-rs/canvas, a native addon that's been
 * confirmed to crash the whole Node process outright (no catchable JS error, no log line — just
 * gone) when invoked in-process here, despite working reliably as a one-shot script every other
 * time it's been used this project. Running it in a disposable child process means that crash
 * (whatever in this specific process's module graph triggers it) takes down one render request,
 * not the API server serving every other user.
 *
 * Usage:
 *   tsx pdfRenderWorker.ts single <input.pdf> <pageNumber> <output.png> <dpi>
 *   tsx pdfRenderWorker.ts all <input.pdf> <outputDir> <dpi>
 *     writes <outputDir>/1.png, 2.png, ... and <outputDir>/manifest.json
 *     ([{page,width,height,filename}]) — one process render every page instead of one
 *     child-process spawn per page, since tsx's own startup cost dominates at 13+ pages.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const STANDARD_FONT_DATA_URL = `${path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')}/`;

async function renderOnePage(doc: Awaited<ReturnType<(typeof pdfjsLib)['getDocument']>['promise']>, pageNumber: number, scale: number) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx as never, canvas: canvas as never, viewport }).promise;
  return { buffer: canvas.toBuffer('image/png'), width: viewport.width, height: viewport.height };
}

const [, , mode, inputPath, arg2, arg3] = process.argv;

if (mode === 'single') {
  const [pageArg, outputPath, dpiArg] = [arg2, arg3, process.argv[6]];
  if (!inputPath || !pageArg || !outputPath || !dpiArg) {
    console.error('Usage: pdfRenderWorker.ts single <input.pdf> <pageNumber> <output.png> <dpi>');
    process.exit(1);
  }
  const pageNumber = Number(pageArg);
  const scale = Number(dpiArg) / 72;
  const pdfBytes = await readFile(inputPath);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes), standardFontDataUrl: STANDARD_FONT_DATA_URL }).promise;
  try {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > doc.numPages) {
      console.error(`This document has no page ${pageArg}`);
      process.exit(2);
    }
    const { buffer } = await renderOnePage(doc, pageNumber, scale);
    await writeFile(outputPath, buffer);
  } finally {
    await doc.destroy();
  }
} else if (mode === 'all') {
  const [outputDir, dpiArg] = [arg2, arg3];
  if (!inputPath || !outputDir || !dpiArg) {
    console.error('Usage: pdfRenderWorker.ts all <input.pdf> <outputDir> <dpi>');
    process.exit(1);
  }
  const scale = Number(dpiArg) / 72;
  const pdfBytes = await readFile(inputPath);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes), standardFontDataUrl: STANDARD_FONT_DATA_URL }).promise;
  try {
    const manifest: Array<{ page: number; width: number; height: number; filename: string }> = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const { buffer, width, height } = await renderOnePage(doc, pageNumber, scale);
      const filename = `${pageNumber}.png`;
      await writeFile(path.join(outputDir, filename), buffer);
      manifest.push({ page: pageNumber, width, height, filename });
    }
    await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest));
  } finally {
    await doc.destroy();
  }
} else {
  console.error('Unknown mode — expected "single" or "all"');
  process.exit(1);
}
