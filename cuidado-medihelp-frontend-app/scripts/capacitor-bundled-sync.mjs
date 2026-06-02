import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const adbCandidates = [
  process.env.ADB,
  process.env.ANDROID_HOME
    ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe')
    : null,
  process.env.ANDROID_SDK_ROOT
    ? join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe')
    : null,
  process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe')
    : null,
].filter(Boolean);

const adbPath = adbCandidates.find((candidate) => existsSync(candidate));

if (adbPath) {
  const reverseCleanup = spawnSync(adbPath, ['reverse', '--remove', 'tcp:5173'], {
    encoding: 'utf8',
  });

  if (reverseCleanup.status === 0) {
    console.log('Removed live-sync ADB reverse for tcp:5173.');
  } else {
    console.log('No live-sync ADB reverse needed for tcp:5173.');
  }
} else {
  console.log('ADB was not found in Android SDK paths; skipping reverse cleanup.');
}

const env = { ...process.env };
delete env.CAPACITOR_LIVE_RELOAD;
delete env.CAPACITOR_SERVER_URL;

const sync = spawnSync('npx', ['cap', 'sync', 'android'], {
  env,
  shell: true,
  stdio: 'inherit',
});

if (sync.error) {
  console.error(sync.error.message);
  process.exit(1);
}

process.exit(sync.status ?? 1);
