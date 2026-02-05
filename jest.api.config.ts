import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  displayName: 'api-tests',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.api.setup.ts'],
  testMatch: ['<rootDir>/src/__tests__/api/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/app/api/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

export default createJestConfig(config);
