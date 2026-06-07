/**
 * courseUtils.js
 *
 * Utility helpers for normalizing course shorthand codes
 * (as produced by OCR / Grade Report imports) into the canonical
 * program names used throughout the app and displayed in the dashboard.
 */

/** Canonical full-form program names (mirror of constants.js PROGRAMS). */
export const PROGRAM_BSIT  = 'Bachelor of Science in Industrial Technology'
export const PROGRAM_BSMAT = 'Bachelor of Science in Mechatronics and Automation Technology'
export const PROGRAM_2YEAR = 'Two-Year Technical Course'
export const PROGRAM_1YEAR = 'One-Year Technical Course'

/**
 * Lookup table: shorthand key (UPPER, spaces→hyphens) → canonical program name.
 * Keep in sync with the backend _COURSE_NORM_MAP in import_routes.py.
 */
const COURSE_NORM_MAP = {
  // 2-Year Technical Courses
  ELECTRO:          PROGRAM_2YEAR,
  ELECTRONICS:      PROGRAM_2YEAR,
  ELECTRI:          PROGRAM_2YEAR,
  ELECTRICAL:       PROGRAM_2YEAR,
  AUTO:             PROGRAM_2YEAR,
  AUTOMOTIVE:       PROGRAM_2YEAR,
  AMAT:             PROGRAM_2YEAR, // Associate in Mechatronics

  // BSIT variants
  BSIT:             PROGRAM_BSIT,
  'BSIT-ELECTRI':   PROGRAM_BSIT,
  'BSIT-ELECTRICAL':PROGRAM_BSIT,
  'BSIT-ELECTRO':   PROGRAM_BSIT,
  'BSIT-ELECTRONICS':PROGRAM_BSIT,
  'BSIT-AUTO':      PROGRAM_BSIT,
  'BSIT-AUTOMOTIVE':PROGRAM_BSIT,

  // BSMAT
  BSMAT:            PROGRAM_BSMAT,
  'BS-MAT':         PROGRAM_BSMAT,
}

/**
 * Normalize a raw course string into a canonical program name.
 * If the string is already a full/known name it is returned as-is.
 *
 * @param {string|null|undefined} raw
 * @returns {string} Canonical program name or the original value.
 */
export function normalizeCourse(raw) {
  if (!raw) return raw

  const key = raw.trim().toUpperCase().replace(/\s+/g, '-')

  // Exact match
  if (COURSE_NORM_MAP[key]) return COURSE_NORM_MAP[key]

  // Try prefix match for codes like 'BSIT-ELECTRI-2'
  const parts = key.split('-')
  for (let end = parts.length; end > 0; end--) {
    const candidate = parts.slice(0, end).join('-')
    if (COURSE_NORM_MAP[candidate]) return COURSE_NORM_MAP[candidate]
  }

  // Already a full name or unknown shorthand — return as-is
  return raw
}

/**
 * Returns true if the normalized course matches the given canonical program name.
 *
 * @param {string|null|undefined} raw  - raw course value from the student record
 * @param {string} programName        - one of the PROGRAM_* constants
 */
export function courseMatches(raw, programName) {
  return normalizeCourse(raw) === programName
}
