/**
 * Code.test.js — Tests the web app endpoints in src/Code.js.
 *
 * Code.js relies on global GAS services and on functions defined in Utils.js.
 * To exercise it under Jest we eval the source file with both files loaded
 * into the same scope, mimicking how GAS treats every top-level function as
 * a global.
 */

const fs = require('fs')
const path = require('path')
const vm = require('vm')

function loadGasContext () {
  const ctx = {
    console,
    Date,
    Number,
    HtmlService: global.HtmlService,
    PropertiesService: global.PropertiesService
  }
  vm.createContext(ctx)

  const utilsSrc = fs.readFileSync(path.join(__dirname, '../src/Utils.js'), 'utf8')
  const codeSrc = fs.readFileSync(path.join(__dirname, '../src/Code.js'), 'utf8')

  vm.runInContext(utilsSrc, ctx)
  vm.runInContext(codeSrc, ctx)

  return ctx
}

describe('getPersonalGreeting', () => {
  let gas

  beforeEach(() => {
    gas = loadGasContext()
  })

  test('returns success for a valid name', () => {
    // Pin the hour so the assertion is deterministic
    const realDate = gas.Date
    gas.Date = class extends realDate {
      constructor () { super(); this.getHours = () => 9 }
    }

    const res = gas.getPersonalGreeting('Justin')
    expect(res.success).toBe(true)
    expect(res.message).toMatch(/Justin/)
  })

  test('returns success even with empty name (greeting still works)', () => {
    const res = gas.getPersonalGreeting('')
    expect(res.success).toBe(true)
    // No name → no comma in the greeting
    expect(res.message).not.toMatch(/,/)
  })

  test('returns structured failure if hour fabrication breaks invariants', () => {
    // Replace Date so getHours returns an invalid value, forcing buildGreeting to throw
    gas.Date = class {
      constructor () {}
      getHours () { return 99 }
    }

    const res = gas.getPersonalGreeting('Justin')
    expect(res.success).toBe(false)
    expect(res.code).toBe('RangeError')
    expect(res.message).toMatch(/0\.\.23/)
  })
})

describe('doGet', () => {
  test('builds template, sets title, returns evaluated output', () => {
    const gas = loadGasContext()
    gas.doGet({})

    expect(global.HtmlService.createTemplateFromFile).toHaveBeenCalledWith('index')
    const template = global.HtmlService.createTemplateFromFile.mock.results[0].value
    expect(template.evaluate).toHaveBeenCalled()
    expect(template.setTitle).toHaveBeenCalledWith('GAS CI/CD Demo')
  })
})
