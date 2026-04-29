/* global ScriptApp */

/**
 * Triggers.js — One-time trigger setup, run manually from the GAS UI after
 * the first deploy to a new environment.
 *
 * Triggers are *project state*, not source code, so clasp can't deploy them.
 * This module is the convention: keep installation idempotent and version-
 * controlled even though invocation is manual.
 */

/**
 * Installs all production triggers, removing any previously installed by this
 * script first to keep the operation idempotent.
 *
 * Run once after a fresh deploy. Safe to re-run.
 */
function installTriggers () {
  removeAllProjectTriggers_()

  ScriptApp.newTrigger('dailyCleanupJob')
    .timeBased()
    .everyDays(1)
    .atHour(2) // 2 AM script timezone
    .create()

  console.log('Triggers installed.')
}

/**
 * Removes every trigger owned by this script. Used by installTriggers() and
 * available standalone for clean teardown of a staging project.
 */
function removeAllProjectTriggers_ () {
  const existing = ScriptApp.getProjectTriggers()
  existing.forEach((t) => ScriptApp.deleteTrigger(t))
  console.log(`Removed ${existing.length} existing trigger(s).`)
}

/**
 * Example scheduled job. Real implementation would do whatever cleanup work
 * the project needs — this is a placeholder that just logs.
 */
function dailyCleanupJob () {
  console.log(`dailyCleanupJob ran at ${new Date().toISOString()}`)
}
