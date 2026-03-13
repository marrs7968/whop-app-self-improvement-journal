#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const env = { ...process.env };
if (!env.DIRECT_URL && env.DATABASE_URL) {
  env.DIRECT_URL = env.DATABASE_URL;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'pipe',
      env,
      shell: true,
      encoding: 'utf8',
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.status === 0) {
      process.exit(0);
    }

    const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
    const isAdvisoryLockTimeout =
      combinedOutput.includes('Error: P1002') &&
      combinedOutput.includes('advisory lock');

    if (!isAdvisoryLockTimeout || attempt === maxAttempts) {
      process.exit(typeof result.status === 'number' ? result.status : 1);
    }

    const waitMs = attempt * 5000;
    process.stderr.write(
      `\nPrisma advisory lock contention detected. Retry ${attempt}/${maxAttempts} in ${waitMs / 1000}s...\n`
    );
    await sleep(waitMs);
  }
}

run().catch((error) => {
  console.error('Migration wrapper failed:', error);
  process.exit(1);
});
