/**
 * Jest configuration for ESM (Node.js native ES modules).
 *
 * The project uses "type": "module" in package.json, so Jest must run with
 * the experimental VM modules flag:
 *   NODE_OPTIONS=--experimental-vm-modules jest
 *
 * - transform: {} disables Babel/ts-jest so files load as native ESM.
 * - testEnvironment: 'node' — no browser globals needed.
 * - testPathIgnorePatterns excludes node_modules (default) and generated Prisma client.
 */

export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/src/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/generated/'],
  // Suppress verbose console noise from the modules under test.
  // Set JEST_VERBOSE=1 to see console output during debugging.
  silent: process.env.JEST_VERBOSE !== '1',
};
