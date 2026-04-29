const { buildGreeting, sanitizeName_ } = require('../src/Utils.js')

describe('buildGreeting', () => {
  describe('time-of-day branches', () => {
    test.each([
      [0, 'Good morning!'],
      [6, 'Good morning!'],
      [11, 'Good morning!'],
      [12, 'Good afternoon!'],
      [16, 'Good afternoon!'],
      [17, 'Good evening!'],
      [23, 'Good evening!']
    ])('hour=%i → %s', (hour, expected) => {
      expect(buildGreeting(hour)).toBe(expected)
    })
  })

  describe('with name', () => {
    test('appends the name', () => {
      expect(buildGreeting(9, 'Justin')).toBe('Good morning, Justin!')
    })

    test('trims whitespace', () => {
      expect(buildGreeting(14, '  Grace  ')).toBe('Good afternoon, Grace!')
    })

    test('strips dangerous characters', () => {
      expect(buildGreeting(20, '<script>alert(1)</script>')).toBe('Good evening, scriptalert1script!')
    })

    test('caps length at 64 chars', () => {
      const long = 'A'.repeat(100)
      const result = buildGreeting(10, long)
      // Greeting prefix + ', ' + 64 chars + '!'
      expect(result).toBe('Good morning, ' + 'A'.repeat(64) + '!')
    })

    test('falls back to no-name greeting when name is empty after sanitization', () => {
      expect(buildGreeting(10, '!!!@@@###')).toBe('Good morning!')
    })

    test('handles non-string name gracefully', () => {
      expect(buildGreeting(10, null)).toBe('Good morning!')
      expect(buildGreeting(10, undefined)).toBe('Good morning!')
      expect(buildGreeting(10, 123)).toBe('Good morning!')
    })
  })

  describe('input validation', () => {
    test('throws TypeError for non-numeric hour', () => {
      expect(() => buildGreeting('9')).toThrow(TypeError)
      expect(() => buildGreeting(null)).toThrow(TypeError)
      expect(() => buildGreeting(NaN)).toThrow(TypeError)
    })

    test('throws RangeError for out-of-bounds hour', () => {
      expect(() => buildGreeting(-1)).toThrow(RangeError)
      expect(() => buildGreeting(24)).toThrow(RangeError)
      expect(() => buildGreeting(99)).toThrow(RangeError)
    })

    test('throws RangeError for non-integer hour', () => {
      expect(() => buildGreeting(9.5)).toThrow(RangeError)
    })
  })
})

describe('sanitizeName_', () => {
  test('preserves unicode letters', () => {
    expect(sanitizeName_('Renée')).toBe('Renée')
    expect(sanitizeName_('李明')).toBe('李明')
  })

  test('preserves hyphens, apostrophes, periods', () => {
    expect(sanitizeName_("O'Brien-Smith Jr.")).toBe("O'Brien-Smith Jr.")
  })

  test('returns empty string for non-string input', () => {
    expect(sanitizeName_(null)).toBe('')
    expect(sanitizeName_(undefined)).toBe('')
    expect(sanitizeName_(42)).toBe('')
    expect(sanitizeName_({})).toBe('')
  })
})
