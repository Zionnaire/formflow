import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ApiError } from '../Utils/errors.js';
import { logger } from '../Middlewares/logger.js';

const execFileAsync = promisify(execFile);
const WORKER_SCRIPT = fileURLToPath(new URL('./pdfRenderWorker.ts', import.meta.url));
// Invoking tsx via `npx` fails on Windows (`spawn npx ENOENT` — execFile doesn't go through a
// shell, so it can't resolve the `npx.cmd` shim the way a shell would) — resolve tsx's own CLI
// entry point and run it directly with the current Node binary instead, which works identically
// cross-platform and doesn't depend on PATH resolution at all.
const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve('tsx/cli');

/** The DPI every newly-rasterized template is rendered at — the sole conversion constant between a page image's pixels and PDF points (points = pixels * 72 / RENDER_DPI). Change this only with a plan for what happens to already-rasterized templates, which keep whatever DPI they were actually rendered at (stored per-template as renderDPI, not assumed from this constant). */
export const RENDER_DPI = 150;

/**
 * Runs pdfRenderWorker.ts in a disposable child process, not in-process — confirmed that
 * rendering via @napi-rs/canvas crashes the whole Node process outright when called directly
 * from inside the running API server (no catchable error, just an instant exit), despite the
 * exact same code working reliably every other time it's been run this project as a one-shot
 * script. Whatever in this process's specific module graph triggers that, isolating it means a
 * render failure costs one request instead of the entire server for every other user.
 */
async function runWorker(args: string[]): Promise<void> {
  try {
    await execFileAsync(process.execPath, [TSX_CLI, WORKER_SCRIPT, ...args], { timeout: 120_000, maxBuffer: 1024 * 1024 * 32 });
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? '';
    if (stderr.includes('has no page')) {
      throw new ApiError(404, stderr.trim(), 'NOT_FOUND');
    }
    logger.error({ err }, 'PDF render worker failed');
    throw new ApiError(502, 'Could not render this document for preview', 'INTERNAL_ERROR');
  }
}

/**
 * Renders one page of a PDF to a PNG — the on-demand fallback path for a template that predates
 * pageImages (see Services/template.service.ts's lazy backfill). New templates never call this;
 * their pages are already rasterized once at upload time via renderAllPagesToPngs.
 */
export async function renderPdfPageToPng(pdfBytes: Buffer, pageNumber: number, dpi: number = RENDER_DPI): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), 'formflow-render-'));
  try {
    const inputPath = path.join(dir, 'input.pdf');
    const outputPath = path.join(dir, 'output.png');
    await writeFile(inputPath, pdfBytes);
    await runWorker(['single', inputPath, String(pageNumber), outputPath, String(dpi)]);
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export interface RenderedPage {
  page: number;
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Renders every page of a PDF to a PNG in one child-process invocation — used once, at upload
 * time, to build the canonical rasterized reference every geometry-dependent feature (the
 * field-position editor, ruled-line detection) measures against from then on.
 */
export async function renderAllPagesToPngs(pdfBytes: Buffer, dpi: number = RENDER_DPI): Promise<RenderedPage[]> {
  const dir = await mkdtemp(path.join(tmpdir(), 'formflow-render-'));
  try {
    const inputPath = path.join(dir, 'input.pdf');
    const outDir = path.join(dir, 'out');
    await mkdir(outDir);
    await writeFile(inputPath, pdfBytes);
    await runWorker(['all', inputPath, outDir, String(dpi)]);

    const manifest = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8')) as Array<{
      page: number;
      width: number;
      height: number;
      filename: string;
    }>;
    return Promise.all(
      manifest.map(async (entry) => ({
        page: entry.page,
        width: entry.width,
        height: entry.height,
        buffer: await readFile(path.join(outDir, entry.filename)),
      })),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

