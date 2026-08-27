import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quizspace.badawy',
  appName: 'QuizSpace',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#080D1C',
    },
    Browser: {
      presentationStyle: 'popover',
    },
  },
};

export default config;
