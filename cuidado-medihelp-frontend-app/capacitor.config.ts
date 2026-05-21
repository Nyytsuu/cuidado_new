import type { CapacitorConfig } from '@capacitor/cli';

const liveReload = process.env.CAPACITOR_LIVE_RELOAD === 'true';
const liveReloadUrl = process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:5173';

const config: CapacitorConfig = {
  appId: 'com.cuidado.app',
  appName: 'Cuidado',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    ...(liveReload
      ? {
          url: liveReloadUrl,
          cleartext: true,
        }
      : {}),
  },
};

export default config;
