/**
 * tests/setup.js — Wires Google Apps Script service globals into Node so
 * tests can require src/*.js files that reference them.
 *
 * Tests that need different mock behavior should override these per-test
 * via jest.spyOn() or by reassigning the global.
 */

// HtmlService — minimal surface used by Code.js
global.HtmlService = {
  createTemplateFromFile: jest.fn(() => ({
    greeting: null,
    appVersion: null,
    evaluate: jest.fn().mockReturnThis(),
    setTitle: jest.fn().mockReturnThis(),
    setXFrameOptionsMode: jest.fn().mockReturnThis()
  })),
  XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
}

// PropertiesService — used by getAppVersion_()
global.PropertiesService = {
  getScriptProperties: jest.fn(() => ({
    getProperty: jest.fn(() => null),
    setProperty: jest.fn(),
    deleteProperty: jest.fn()
  }))
}

// ScriptApp — used by Triggers.js (covered by integration tests, not unit)
global.ScriptApp = {
  newTrigger: jest.fn(),
  getProjectTriggers: jest.fn(() => []),
  deleteTrigger: jest.fn()
}

// console is already a Node global; no shim needed.
