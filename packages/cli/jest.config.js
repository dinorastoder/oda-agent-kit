/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@oda-agent/core$': '<rootDir>/../core/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
