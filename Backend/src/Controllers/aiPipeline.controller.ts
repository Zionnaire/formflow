/**
 * AI-assisted PDF pipeline — field extraction, profile auto-fill mapping, validation,
 * and final PDF generation (brief section 8). Extraction and auto-fill call Groq
 * (Services/groq.service.ts) over text flattened from the PDF (Services/pdfText.service.ts);
 * validation and generation are deterministic (Services/pdf.service.ts) — no LLM call needed
 * for exact-match required-field checks or for overlaying already-known values onto the PDF.
 */
import type { Request, Response } from 'express';
import { extractAndCreateTemplate } from '../Services/template.service.js';
import {
  autoFillSubmission,
  validateSubmission,
  generateSubmissionPdf,
  downloadGeneratedPdf,
  emailGeneratedPdf,
  suggestFieldValue,
} from '../Services/submission.service.js';
import { createApiSuccess } from '../Utils/response.js';
import { asyncHandler } from '../Utils/asyncHandler.js';

export const extractFieldsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { fileHash, cloudinaryId, title } = req.body as { fileHash: string; cloudinaryId: string; title: string };
  const template = await extractAndCreateTemplate(fileHash, cloudinaryId, title, req.user!.sub);
  res.status(201).json(createApiSuccess({ template }));
});

export const autoFillHandler = asyncHandler(async (req: Request, res: Response) => {
  const submission = await autoFillSubmission(req.params['id'] as string, req.user!.sub);
  res.json(createApiSuccess({ submission }));
});

export const validateSubmissionHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await validateSubmission(req.params['id'] as string, req.user!.sub);
  res.json(createApiSuccess(result));
});

export const generatePdfHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await generateSubmissionPdf(req.params['id'] as string, req.user!.sub);
  res.json(createApiSuccess(result));
});

export const suggestFieldHandler = asyncHandler(async (req: Request, res: Response) => {
  const value = await suggestFieldValue(req.params['id'] as string, req.user!.sub, req.params['fieldId'] as string);
  res.json(createApiSuccess({ value }));
});

export const downloadPdfHandler = asyncHandler(async (req: Request, res: Response) => {
  const { bytes, filename } = await downloadGeneratedPdf(req.params['id'] as string, req.user!.sub);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(bytes);
});

export const emailPdfHandler = asyncHandler(async (req: Request, res: Response) => {
  const { to, message } = req.body as { to: string; message?: string };
  await emailGeneratedPdf(req.params['id'] as string, req.user!.sub, to, message);
  res.json(createApiSuccess({ sent: true }));
});
