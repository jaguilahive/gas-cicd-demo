/* global HtmlService */

/**
 * Code.js — Web app entry points and server-side endpoints exposed to the client.
 *
 * Everything in this file touches GAS services, so it's intentionally thin.
 * Real logic lives in Utils.js where it can be unit-tested.
 */

/**
 * Web app entry point. Renders index.html with a server-rendered greeting.
 *
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet (e) {
  const template = HtmlService.createTemplateFromFile('index')
  template.greeting = buildGreeting(getHourOfDay())
  template.appVersion = getAppVersion_()
  return template
    .evaluate()
    .setTitle('GAS CI/CD Demo')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

/**
 * Server-side endpoint callable from the client via google.script.run.
 * Returns a structured response so the client can branch on success/failure
 * without parsing string output.
 *
 * @param {string} name
 * @returns {{ success: boolean, message: string, code?: string }}
 */
function getPersonalGreeting (name) {
  try {
    const greeting = buildGreeting(getHourOfDay(), name)
    return { success: true, message: greeting }
  } catch (err) {
    console.error('getPersonalGreeting failed:', err && err.stack ? err.stack : err)
    return {
      success: false,
      message: err && err.message ? err.message : 'Unknown error',
      code: err && err.name ? err.name : 'Error'
    }
  }
}

/**
 * Reads the deployed version label injected at deploy time. Falls back to
 * 'dev' for local pushes that skip versioning.
 *
 * @returns {string}
 */
function getAppVersion_ () {
  try {
    const props = PropertiesService.getScriptProperties()
    return props.getProperty('APP_VERSION') || 'dev'
  } catch (err) {
    return 'dev'
  }
}
