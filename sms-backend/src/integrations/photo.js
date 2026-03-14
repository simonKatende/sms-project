/**
 * PhotoUploadAdapter — Multer + Sharp
 *
 * Responsibilities:
 *   - multerUpload  : Multer middleware configured for memory storage.
 *                     Accepts field name 'photo', JPEG/PNG only, max 2 MB.
 *   - savePhoto(buffer, pupilId) : Resize to 300×400 px via Sharp and
 *                                  write to storage/photos/pupils/{pupilId}.jpg
 *
 * The caller (PupilService) is responsible for creating the pupil_photos DB record.
 */

import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';
import sharp from 'sharp';

// ── Constants ─────────────────────────────────────────────────

const PHOTO_DIR   = path.resolve(process.env.STORAGE_PATH ?? './storage', 'photos', 'pupils');
const MAX_SIZE_MB = 2;
const PHOTO_W     = 300;
const PHOTO_H     = 400;

// ── Multer: memory storage (buffer handed to Sharp) ───────────

const fileFilter = (_req, file, cb) => {
  if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPEG and PNG photos are accepted'), { status: 422 }));
  }
};

export const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter,
});

// ── Sharp: resize + save ──────────────────────────────────────

/**
 * Resize the uploaded photo buffer and persist it to disk.
 *
 * @param {Buffer} buffer   — raw file buffer from multer (req.file.buffer)
 * @param {string} pupilId  — UUID used as the filename
 * @returns {Promise<string>} relative file path stored in DB (e.g. 'photos/pupils/abc123.jpg')
 */
export async function savePhoto(buffer, pupilId) {
  await fs.mkdir(PHOTO_DIR, { recursive: true });

  const filename = `${pupilId}.jpg`;
  const fullPath = path.join(PHOTO_DIR, filename);

  await sharp(buffer)
    .resize(PHOTO_W, PHOTO_H, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 85 })
    .toFile(fullPath);

  // Store a relative path so the app remains portable across machines
  return path.join('photos', 'pupils', filename).replace(/\\/g, '/');
}
