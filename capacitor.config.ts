import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jupitoreducation.app',
  appName: 'Jupitor Education',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '795910506461-suqiqotnrulm6h1jab083l6sdjmrrs9a.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      showSpinner: true,
      spinnerColor: "#999999",
    }
  },
};

export default config;
