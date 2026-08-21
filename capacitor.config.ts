import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.koomn1.quizspace',
  appName: 'Quiz Space',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 450,
      launchAutoHide: true,
      backgroundColor: '#0b1020',
      showSpinner: false,
    },
    SecureStorage: {
      keyPrefix: 'quizspace_secure_',
    },
  },
};

export default config;

// The app intentionally has no `server.url`: all UI assets are bundled in the APK.
// Supabase remains the remote source of truth for accounts and synchronized data.
