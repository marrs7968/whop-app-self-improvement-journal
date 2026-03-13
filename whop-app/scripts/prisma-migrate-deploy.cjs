#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const env = { ...process.env };
if (!env.DIRECT_URL && env.DATABASE_URL) {
  env.DIRECT_URL = env.DATABASE_URL;
}

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env,
  shell: true,
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
