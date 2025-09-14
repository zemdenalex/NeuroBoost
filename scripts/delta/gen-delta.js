#!/usr/bin/env node
/*
 * gen-delta.js — create a Delta Request stub for NeuroBoost in Node.js.
 *
 * Usage: `node gen-delta.js [outputPath]`
 * If no outputPath is given, a timestamped file is created in the current directory.
 */

const fs = require('fs');
const path = require('path');

// Determine output filename
const args = process.argv.slice(2);
const outFile = args[0] || `delta-${new Date().toISOString().replace(/[:T]/g, '').slice(0, 13)}.md`;

const template = `# Delta Request

Files:
Goal:
Constraints:
Acceptance:
- [ ] Behavior matches description
- [ ] No console/server errors
- [ ] Meets NFR timings
- [ ] Tests/docs updated
Non-goals:

Context (minimal snippet):
\`\`
\`\`

Return: unified diff + run commands + verification checklist.
`;

fs.writeFileSync(outFile, template, { encoding: 'utf8' });
console.log(`Created ${outFile}`);