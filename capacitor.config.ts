import type { CapacitorConfig } from "@capacitor/cli";

/**
 * SignBridge AI Android app shell.
 *
 * The web app is a full-stack TanStack Start app (server functions for
 * emergency alerts), so the Android WebView loads the published app URL
 * instead of a bundled static build. Camera, microphone and location
 * permissions are declared in the generated android/ project.
 */
const config: CapacitorConfig = {
  appId: "com.signbridgeai.app",
  appName: "SignBridge AI",
  webDir: "dist",
  server: {
    url: "https://fluent-sign-chat.lovable.app",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
