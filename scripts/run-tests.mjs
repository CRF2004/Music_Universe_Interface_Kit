#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(repositoryRoot, 'src');

async function findTests(directory) {
  const tests = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...(await findTests(absolutePath)));
    } else if (entry.name.endsWith('.test.ts')) {
      tests.push(absolutePath);
    }
  }
  return tests;
}

const tests = (await findTests(sourceRoot)).sort();
if (tests.length === 0) {
  console.error('No test files found under src/.');
  process.exit(1);
}

const child = spawn(
  process.execPath,
  ['--import', 'tsx', '--test', ...tests],
  { cwd: repositoryRoot, stdio: 'inherit' },
);
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Test runner stopped by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
