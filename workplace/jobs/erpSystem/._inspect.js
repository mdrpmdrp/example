const fs = require('fs');
const path = require('path');
const file = process.argv[2];
const start = Number(process.argv[3]);
const end = Number(process.argv[4]);
if (!file || !start || !end) {
  console.error('Usage: node ._inspect.js <file> <start> <end>');
  process.exit(1);
}
const lines = fs.readFileSync(path.resolve(file), 'utf8').split(/\r?\n/);
for (let i = start; i <= end; i++) {
  console.log(String(i).padStart(5) + ': ' + (lines[i - 1] || ''));
}
