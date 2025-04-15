const fs = require('fs');
const path = require('path');

// Path to the rollup native.js file
const nativeJsPath = path.join(__dirname, 'node_modules', 'rollup', 'dist', 'native.js');

// Check if the file exists
if (!fs.existsSync(nativeJsPath)) {
  console.error('Rollup native.js file not found. Skipping patch.');
  process.exit(0);
}

// Modified content that provides all necessary exports in the correct format
const modifiedContent = `
// Patched version that bypasses native module loading
const path = require('path');

// Mock implementation with all required exports
const isNativeSupported = () => false;
const needsRebuilding = () => false;
const loadNative = () => null;

// Parse functions that other modules rely on
const parse = (code, options) => {
  throw new Error('Native parsing is disabled. Using JS implementation.');
};

const parseAsync = async (code, options) => {
  throw new Error('Native parsing is disabled. Using JS implementation.');
};

// Export in both ESM and CommonJS format to support different import styles
module.exports = {
  isNativeSupported,
  needsRebuilding,
  loadNative,
  parse,
  parseAsync
};

// Also provide named exports for ESM importers
exports.isNativeSupported = isNativeSupported;
exports.needsRebuilding = needsRebuilding;
exports.loadNative = loadNative;
exports.parse = parse;
exports.parseAsync = parseAsync;
`;

// Write the modified content back to the file
fs.writeFileSync(nativeJsPath, modifiedContent);

// Also create a new patch for ESM version if it exists
const esmNativeJsPath = path.join(__dirname, 'node_modules', 'rollup', 'dist', 'es', 'native.js');
if (fs.existsSync(esmNativeJsPath)) {
  // ESM version needs different export syntax
  const esmModifiedContent = `
// Patched ESM version
// Mock implementation with all required exports
export const isNativeSupported = () => false;
export const needsRebuilding = () => false;
export const loadNative = () => null;

// Parse functions that other modules rely on
export const parse = (code, options) => {
  throw new Error('Native parsing is disabled. Using JS implementation.');
};

export const parseAsync = async (code, options) => {
  throw new Error('Native parsing is disabled. Using JS implementation.');
};

export default {
  isNativeSupported,
  needsRebuilding,
  loadNative,
  parse,
  parseAsync
};
`;

  fs.writeFileSync(esmNativeJsPath, esmModifiedContent);
  console.log('Successfully patched rollup ESM native.js to bypass native module loading.');
}

console.log('Successfully patched rollup native.js to bypass native module loading.');
