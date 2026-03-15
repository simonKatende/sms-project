/**
 * LogoAdapter — Multer + fs
 *
 * Responsibilities:
 *   - logoUpload : Multer middleware. Accepts 'logo' field, JPEG/PNG/SVG, max 2 MB.
 *   - saveLogo(buffer, mimetype) : Write raw buffer to storage/logos/school-logo.{ext}
 *                                  Returns relative path for DB storage.
 *
 * Unlike pupil photos we do NOT resize the logo — schools may supply a
 * carefully crafted SVG or high-res PNG. We store it as-is.
 */

import path from 'path';
import fs   from 'fs/promises';
import multer from 'multer';

// ── Constants ─────────────────────────────────────────────────

const LOGO_DIR    = path.resolve(process.env.STORAGE_PATH ?? './storage', 'logos');
const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

// ── Multer: memory storage ────────────────────────────────────

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(
      new Error('Only JPEG, PNG, or SVG logos are accepted'),
      { status: 422 },
    ));
  }
};

export const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter,
});

// ── Save logo ─────────────────────────────────────────────────

/**
 * Persist the uploaded logo buffer to disk, replacing any existing file.
 *
 * @param {Buffer} buffer   — raw file buffer from multer (req.file.buffer)
 * @param {string} mimetype — MIME type to determine file extension
 * @returns {Promise<string>} relative path stored in DB (e.g. 'logos/school-logo.png')
 */
export async function saveLogo(buffer, mimetype) {
  await fs.mkdir(LOGO_DIR, { recursive: true });

  const ext      = mimetype === 'image/svg+xml' ? 'svg'
                 : mimetype === 'image/png'      ? 'png'
                 : 'jpg';
  const filename = `school-logo.${ext}`;
  const fullPath = path.join(LOGO_DIR, filename);

  await fs.writeFile(fullPath, buffer);

  return `logos/${filename}`;
}
