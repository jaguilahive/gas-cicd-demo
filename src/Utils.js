/**
 * Utils.js — pure helper functions with no GAS service dependencies.
 *
 * Keeping the testable logic free of SpreadsheetApp / DriveApp / HtmlService calls
 * means Jest can exercise it directly under Node. The conditional `module.exports`
 * at the bottom is a no-op in the GAS V8 runtime (where `module` is undefined)
 * but lets test files require this file like a normal CommonJS module.
 */

/**
 * Returns the current hour of day (0–23) in the script's timezone.
 * Wrapped in a function so tests can override it.
 *
 * @returns {number}
 */
function getHourOfDay () {
  return new Date().getHours()
}

/**
 * Builds a time-aware greeting.
 *
 * @param {number} hour — integer 0..23
 * @param {string} [name] — optional addressee
 * @returns {string}
 * @throws {RangeError} if hour is out of range
 * @throws {TypeError}  if hour is not a number
 */
function buildGreeting (hour, name) {
  if (typeof hour !== 'number' || Number.isNaN(hour)) {
    throw new TypeError(`hour must be a number, got ${typeof hour}`)
  }
  if (hour < 0 || hour > 23 || !Number.isInteger(hour)) {
    throw new RangeError(`hour must be an integer 0..23, got ${hour}`)
  }

  let salutation
  if (hour < 12) salutation = 'Good morning'
  else if (hour < 17) salutation = 'Good afternoon'
  else salutation = 'Good evening'

  const safeName = sanitizeName_(name)
  return safeName ? `${salutation}, ${safeName}!` : `${salutation}!`
}

/**
 * Trims and length-caps a user-provided name. Returns empty string if invalid.
 * Trailing underscore on the name is GAS convention for "private" (not exported
 * as a callable from google.script.run).
 *
 * @param {*} name
 * @returns {string}
 */
function sanitizeName_ (name) {
  if (typeof name !== 'string') return ''
  const trimmed = name.trim().slice(0, 64)
  // Strip anything that isn't a letter, number, space, hyphen, apostrophe, or period.
  return trimmed.replace(/[^\p{L}\p{N}\s\-'.]/gu, '')
}

// ---- Test-only export. Ignored by the GAS runtime. ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getHourOfDay, buildGreeting, sanitizeName_ }
}
