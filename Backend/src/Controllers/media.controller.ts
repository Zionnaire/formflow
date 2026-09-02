import type { Request, Response } from 'express';
import { uploadImage } from '../Services/cloudinary.service.js';
import { UserModel } from '../Models/User.model.js';
import { createApiSuccess, createApiError } from '../Utils/response.js';
import { asyncHandler } from '../Utils/asyncHandler.js';
import { API_ERROR_CODES } from '../Types/index.js';

export const uploadSignatureHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json(createApiError(API_ERROR_CODES.VALIDATION_ERROR, 'No file provided'));
    return;
  }
  const result = await uploadImage(req.file.buffer, 'signatures', { maxWidth: 800, maxHeight: 400 });
  await UserModel.updateOne({ _id: req.user!.sub }, { $set: { 'mediaAssets.signatureUrl': result.url } });
  res.json(createApiSuccess({ signatureUrl: result.url }));
});

export const uploadPhotoHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json(createApiError(API_ERROR_CODES.VALIDATION_ERROR, 'No file provided'));
    return;
  }
  const result = await uploadImage(req.file.buffer, 'passport-photos', { maxWidth: 600, maxHeight: 800 });
  await UserModel.updateOne({ _id: req.user!.sub }, { $set: { 'mediaAssets.passportPhotoUrl': result.url } });
  res.json(createApiSuccess({ passportPhotoUrl: result.url }));
});
