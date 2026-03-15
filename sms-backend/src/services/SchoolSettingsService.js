/**
 * SchoolSettingsService — institution profile read + write.
 *
 * school_settings is a SINGLE-ROW table (upsert pattern).
 * logoPath is stored as a relative path (e.g. 'logos/school-logo.png').
 * The full URL is constructed here using the request base URL.
 */

import { prisma }    from '../lib/prisma.js';
import { saveLogo }  from '../integrations/logo.js';

// ── Helpers ───────────────────────────────────────────────────

/**
 * Build a full logo URL from a relative storage path.
 * @param {string|null} logoPath  — 'logos/school-logo.png' or null
 * @param {string}      baseUrl   — e.g. 'http://localhost:3000'
 * @returns {string|null}
 */
function buildLogoUrl(logoPath, baseUrl) {
  return logoPath ? `${baseUrl}/storage/${logoPath}` : null;
}

// ── getProfile ────────────────────────────────────────────────

/**
 * Return the current institution profile.
 * Returns a sensible default object if the row has never been saved.
 *
 * @param {string} baseUrl — request base URL for building logoUrl
 * @returns {Promise<object>}
 */
export async function getProfile(baseUrl) {
  const row = await prisma.schoolSetting.findFirst();

  if (!row) {
    return {
      schoolName:             'Highfield Primary School',
      schoolMotto:            null,
      addressLine1:           null,
      addressLine2:           null,
      phonePrimary:           null,
      phoneSecondary:         null,
      email:                  null,
      website:                null,
      logoPath:               null,
      logoUrl:                null,
      mobileMoneyMtn:         null,
      mobileMoneyAirtel:      null,
      mobileMoneyAccountName: null,
      invoiceFineAfterDueDate: null,
    };
  }

  return {
    ...row,
    logoUrl: buildLogoUrl(row.logoPath, baseUrl),
  };
}

// ── updateProfile ─────────────────────────────────────────────

/**
 * Upsert the institution profile row.
 * If a logo file is provided it is saved to disk first, then logo_path is updated.
 *
 * @param {object}      params
 * @param {object}      params.fields   — validated text fields from controller
 * @param {object|null} params.logoFile — multer file object (req.file) or null
 * @param {string}      params.baseUrl  — for building logoUrl in response
 * @returns {Promise<object>} updated profile with logoUrl
 */
export async function updateProfile({ fields, logoFile, baseUrl }) {
  // ── 1. Save logo to disk if a new file was uploaded ──────────
  let logoPath;
  if (logoFile) {
    logoPath = await saveLogo(logoFile.buffer, logoFile.mimetype);
  }

  // ── 2. Build the data object ──────────────────────────────────
  const data = {
    schoolName:             fields.schoolName              ?? 'Highfield Primary School',
    schoolMotto:            fields.schoolMotto             ?? null,
    addressLine1:           fields.addressLine1            ?? null,
    addressLine2:           fields.addressLine2            ?? null,
    phonePrimary:           fields.primaryPhone            ?? null,
    phoneSecondary:         fields.secondaryPhone          ?? null,
    email:                  fields.email                   ?? null,
    website:                fields.website                 ?? null,
    mobileMoneyMtn:         fields.mobileMoneyMtn          ?? null,
    mobileMoneyAirtel:      fields.mobileMoneyAirtel       ?? null,
    mobileMoneyAccountName: fields.mobileMoneyAccountName  ?? null,
    invoiceFineAfterDueDate: fields.invoiceFineAfterDueDate != null
                              ? parseInt(fields.invoiceFineAfterDueDate, 10)
                              : null,
    ...(logoPath && { logoPath }),
  };

  // ── 3. Upsert (single-row pattern) ────────────────────────────
  const existing = await prisma.schoolSetting.findFirst();

  const row = existing
    ? await prisma.schoolSetting.update({ where: { id: existing.id }, data })
    : await prisma.schoolSetting.create({ data });

  return {
    ...row,
    logoUrl: buildLogoUrl(row.logoPath, baseUrl),
  };
}
