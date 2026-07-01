#!/usr/bin/env node

const { execFileSync } = require('node:child_process');

const PROTECTED_PATHS = [
  'platform-packages/index.json',
  'platform-packages/index.seed.json',
  'platform-packages/history',
];

const ALLOW_ENV = 'ALLOW_PLATFORM_RELEASE_INDEX_WRITE';

function runGit(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function pathspecArgs() {
  return ['--', ...PROTECTED_PATHS];
}

function changedLines(args) {
  try {
    const output = runGit(args).replace(/\r?\n$/, '');
    return output ? output.split('\n').filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function unique(values) {
  return [...new Set(values)].sort();
}

function protectedPathFromStatusLine(line) {
  return line.slice(3).replace(/^"|"$/g, '');
}

function isAllowedReleaseWriter() {
  return process.env[ALLOW_ENV] === '1';
}

function collectLocalChanges() {
  const status = changedLines(['status', '--porcelain', ...pathspecArgs()])
    .map(protectedPathFromStatusLine);
  const unstaged = changedLines(['diff', '--name-only', ...pathspecArgs()]);
  const staged = changedLines(['diff', '--cached', '--name-only', ...pathspecArgs()]);
  return unique([...status, ...unstaged, ...staged]);
}

function collectAheadOfUpstreamChanges() {
  try {
    runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  } catch (error) {
    return [];
  }
  return unique(changedLines(['diff', '--name-only', '@{u}...HEAD', ...pathspecArgs()]));
}

function collectPullRequestChanges() {
  const baseRef = process.env.GITHUB_BASE_REF;
  if (!process.env.GITHUB_ACTIONS || !baseRef) {
    return [];
  }

  try {
    execFileSync('git', ['fetch', '--depth=1', 'origin', baseRef], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (error) {
    // Fall back to the local checkout shape below.
  }

  const fromBase = changedLines(['diff', '--name-only', `origin/${baseRef}...HEAD`, ...pathspecArgs()]);
  if (fromBase.length > 0) {
    return unique(fromBase);
  }
  return unique(changedLines(['diff', '--name-only', 'HEAD^', 'HEAD', ...pathspecArgs()]));
}

function main() {
  if (isAllowedReleaseWriter()) {
    return;
  }

  const changed = unique([
    ...collectLocalChanges(),
    ...collectAheadOfUpstreamChanges(),
    ...collectPullRequestChanges(),
  ]);

  if (changed.length === 0) {
    return;
  }

  console.error('Protected platform package release index files were changed outside the publish workflow:');
  for (const filePath of changed) {
    console.error(`  - ${filePath}`);
  }
  console.error('');
  console.error('These files are the public update switch and must only be written after all platform package assets are uploaded and verified.');
  console.error(`Set ${ALLOW_ENV}=1 only inside the Platform Packages publish workflow.`);
  process.exit(1);
}

main();
