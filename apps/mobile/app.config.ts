import { ExpoConfig, ConfigContext } from "expo/config";

const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === "production";

const config = ({ config }: ConfigContext): ExpoConfig => {
  const plugins: ExpoConfig["plugins"] = [
    "expo-router",
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#007AFF",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-localization",
  ];

  // Only include Sentry plugin in production builds to avoid
  // "Upload Debug Symbols" failures in dev/preview builds
  if (IS_PRODUCTION) {
    plugins.push([
      "@sentry/react-native/expo",
      {
        organization: "bengi",
        project: "mono-cygobet",
      },
    ]);
  }

  return {
    name: "mobile",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.cygobet.mobile",
      associatedDomains: ["applinks:mono-cygobet.onrender.com"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.cygobet.mobile",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "mono-cygobet.onrender.com",
              pathPrefix: "/groups/join",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "mono-cygobet.onrender.com",
              pathPrefix: "/reset-password",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins,
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "2f4f7f3c-5d53-4cad-ba52-07cf94dbeac4",
      },
    },
    owner: "bengi2810s-organization",
  };
};

export default config;
