/**
 * Expo App Configuration
 * This file dynamically loads environment variables and injects them into the app
 */

// Load environment variables from .env file
require('dotenv').config();

module.exports = ({ config }) => {
  // Get API key from environment (with fallback to check both sources)
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    'AIzaSyA8rAIJ8RCfSdBamPrN-JxILhHkYiGW0Zo'; // Hardcoded fallback for development

  console.log('📦 App Config Loading...');
  console.log(`  Google Maps API Key: ${googleMapsApiKey ? googleMapsApiKey.substring(0, 10) + '...' : 'NOT FOUND'}`);

  return {
    ...config,
    name: config.name || 'Stepquest',
    slug: config.slug || 'stepquest',
    extra: {
      // Preserve existing extra fields (including eas.projectId)
      ...(config.extra || {}),
      // Expose environment variables to the app via expo-constants
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey,
      EXPO_PUBLIC_NEWELL_API_URL: process.env.EXPO_PUBLIC_NEWELL_API_URL || 'https://newell.fastshot.ai',
      EXPO_PUBLIC_PROJECT_ID: process.env.EXPO_PUBLIC_PROJECT_ID || '6f21e3fb-3030-44a5-b579-59ee87110735',
      // Ensure eas.projectId is preserved
      eas: {
        ...(config.extra?.eas || {}),
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey: googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
