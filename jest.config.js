// export const roots = ['<rootDir>/test'];
// export const testMatch = ['**/*.test.ts'];
// export const transform = {
//   '^.+\\.tsx?$': 'ts-jest',
// };

module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/test/envVars.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
