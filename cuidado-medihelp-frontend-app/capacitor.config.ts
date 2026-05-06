import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cuidado.app',
  appName: 'Cuidado',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
};

export default config;
