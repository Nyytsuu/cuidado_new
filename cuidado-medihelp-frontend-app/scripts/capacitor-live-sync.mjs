import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  CAPACITOR_LIVE_RELOAD: 'true',
  CAPACITOR_SERVER_URL: process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:5173',
};

const result = spawnSync('npx', ['cap', 'sync', 'android'], {
  env,
  shell: true,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
