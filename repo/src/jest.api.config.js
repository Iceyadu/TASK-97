const path = require('path');

const appRoot = __dirname;
const repoRoot = path.join(__dirname, '..');
const tsJest = require.resolve('ts-jest', { paths: [appRoot] });

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: repoRoot,
  testMatch: ['<rootDir>/API_tests/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      tsJest,
      {
        tsconfig: path.join(appRoot, 'tsconfig.json'),
      },
    ],
  },
  collectCoverageFrom: ['<rootDir>/src/**/*.(t|j)s'],
  coverageDirectory: path.join(repoRoot, 'coverage', 'api'),
  testEnvironment: 'node',
  moduleNameMapper: { '^@app/(.*)$': '<rootDir>/src/$1' },
  testTimeout: 30000,
};
