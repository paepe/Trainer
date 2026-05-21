import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.trainer.fitness',
  appName: 'TrAIner',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  android: {
    captureInput: true,
  },
};

export default config;
