'use strict';
// scripts/verify-imports.cjs
//
// Verifies that @oda-agent/core and @oda-agent/openclaw-plugin are correctly
// installed in the current working directory and expose their expected exports.
//
// Run from a directory that has already had `npm install` executed:
//   node /path/to/scripts/verify-imports.cjs

const core = require('@oda-agent/core');
const plugin = require('@oda-agent/openclaw-plugin');

const coreKeys = Object.keys(core);
if (!coreKeys.includes('OdaClient')) {
  throw new Error(
    '@oda-agent/core is missing OdaClient export (got: ' + coreKeys.join(', ') + ')'
  );
}
if (typeof plugin.createOpenClawPlugin !== 'function') {
  throw new Error('@oda-agent/openclaw-plugin is missing createOpenClawPlugin export');
}

console.log('  \u2713 @oda-agent/core exports:', coreKeys.join(', '));
console.log('  \u2713 @oda-agent/openclaw-plugin exports:', Object.keys(plugin).join(', '));
