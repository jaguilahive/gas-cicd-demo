module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/Triggers.js',
    '!src/Code.js'
  ],
  coverageReporters: ['text', 'lcov', 'html']
}