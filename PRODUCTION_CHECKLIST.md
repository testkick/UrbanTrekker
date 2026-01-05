# 🚀 Production Deployment Checklist for Stepquest

This document outlines all API keys, configuration, and steps required for deploying Stepquest to TestFlight and production.

---

## 🗺️ Google Maps API Keys

### **Problem**: Maps showing "Map requires a development build" or not loading

### **Solution**: Configure Google Maps API keys for iOS and Android

#### **Step 1: Obtain Google Maps API Keys**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Maps SDK for iOS**
   - **Maps SDK for Android**
4. Create API credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > API Key**
   - Create **separate keys** for iOS and Android (recommended for security)

#### **Step 2: Restrict Your API Keys (Important for Security)**

**For iOS Key:**
- Application restrictions: **iOS apps**
- Add your bundle identifier: `com.glougheed.stepquest`
- API restrictions: Restrict to **Maps SDK for iOS**

**For Android Key:**
- Application restrictions: **Android apps**
- Add your package name: `com.glougheed.fastshotapp`
- Add your SHA-1 certificate fingerprint (get from EAS)
- API restrictions: Restrict to **Maps SDK for Android**

#### **Step 3: Configure in EAS Build**

Add the keys as EAS secrets (recommended) OR configure in `eas.json`:

**Option A: Using EAS Secrets (Recommended)**
```bash
# Set secrets via EAS CLI
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_IOS --value "YOUR_IOS_KEY_HERE" --type string
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_ANDROID --value "YOUR_ANDROID_KEY_HERE" --type string
```

**Option B: Using eas.json (Less Secure)**
Edit `/workspace/eas.json`:
```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "env": {
        "GOOGLE_MAPS_API_KEY": "YOUR_KEY_HERE"
      }
    }
  }
}
```

#### **Step 4: Update app.json**

The `app.json` is already configured to use environment variables:
- **iOS**: `config.googleMapsApiKey: "$(GOOGLE_MAPS_API_KEY)"`
- **Android**: `config.googleMaps.apiKey: "$(GOOGLE_MAPS_API_KEY)"`

These will be automatically replaced during EAS build if you set the environment variable.

---

## 🤖 Newell AI Configuration

### **Problem**: AI mission generation not working in TestFlight

### **Solution**: Configure Newell AI environment variables

#### **Required Environment Variables**

The `@fastshot/ai` library requires:
1. `EXPO_PUBLIC_NEWELL_API_URL` - Newell AI service endpoint
2. `EXPO_PUBLIC_PROJECT_ID` - Your Fastshot project ID

#### **Current Configuration**

Your `.env` file contains:
```env
EXPO_PUBLIC_NEWELL_API_URL=https://newell.fastshot.ai
EXPO_PUBLIC_PROJECT_ID=6f21e3fb-3030-44a5-b579-59ee87110735
```

**⚠️ CRITICAL**: The `.env` file is NOT included in production builds by default!

#### **Step 1: Add to eas.json**

Edit `/workspace/eas.json` to include these variables:
```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_NEWELL_API_URL": "https://newell.fastshot.ai",
        "EXPO_PUBLIC_PROJECT_ID": "6f21e3fb-3030-44a5-b579-59ee87110735"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_NEWELL_API_URL": "https://newell.fastshot.ai",
        "EXPO_PUBLIC_PROJECT_ID": "6f21e3fb-3030-44a5-b579-59ee87110735"
      }
    }
  }
}
```

#### **How AI Fallback Works**

The mission generator (`services/missionGenerator.ts`) has built-in fallback logic:
- If AI call fails → returns default missions
- If AI returns empty response → returns default missions
- If JSON parsing fails → returns default missions

**Default missions are always available** even if AI is completely offline.

---

## 📦 Complete EAS Build Configuration

### **Updated eas.json**

Here's the complete configuration with all required environment variables:

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_NEWELL_API_URL": "https://newell.fastshot.ai",
        "EXPO_PUBLIC_PROJECT_ID": "6f21e3fb-3030-44a5-b579-59ee87110735"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_NEWELL_API_URL": "https://newell.fastshot.ai",
        "EXPO_PUBLIC_PROJECT_ID": "6f21e3fb-3030-44a5-b579-59ee87110735",
        "GOOGLE_MAPS_API_KEY": "YOUR_GOOGLE_MAPS_KEY_HERE"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_NEWELL_API_URL": "https://newell.fastshot.ai",
        "EXPO_PUBLIC_PROJECT_ID": "6f21e3fb-3030-44a5-b579-59ee87110735",
        "GOOGLE_MAPS_API_KEY": "YOUR_GOOGLE_MAPS_KEY_HERE"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 🔍 Debugging Production Issues

### **Check AI Mission Generation**

If missions aren't generating, check the logs:
```bash
# View EAS build logs
eas build:view --id <build-id>

# Check for errors related to:
# - "Mission generation error"
# - Network connectivity issues
# - API endpoint unreachable
```

### **Check Maps**

If maps aren't loading:
1. Verify Google Maps API keys are set correctly
2. Check bundle identifier matches (`com.glougheed.stepquest` for iOS)
3. Check package name matches (`com.glougheed.fastshotapp` for Android)
4. Verify APIs are enabled in Google Cloud Console
5. Check API key restrictions aren't blocking requests

### **Get Android SHA-1 Fingerprint**

For Android Maps to work, you need to add the SHA-1 fingerprint:
```bash
# Get SHA-1 from EAS credentials
eas credentials

# Or from build logs
eas build:view --id <build-id>
```

---

## 📋 Pre-Build Checklist

Before running `eas build`:

- [ ] Google Maps API keys obtained from Google Cloud Console
- [ ] API keys added to eas.json or EAS secrets
- [ ] iOS bundle identifier matches: `com.glougheed.stepquest`
- [ ] Android package name matches: `com.glougheed.fastshotapp`
- [ ] Maps SDK for iOS enabled in Google Cloud
- [ ] Maps SDK for Android enabled in Google Cloud
- [ ] API key restrictions configured (bundle ID for iOS, package name + SHA-1 for Android)
- [ ] Newell AI environment variables added to eas.json
- [ ] All permissions configured in app.json (location, motion, etc.)

---

## 🚀 Build Commands

```bash
# Build for iOS (TestFlight)
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Build preview for testing
eas build --platform ios --profile preview
```

---

## 📱 TestFlight Submission

After successful build:

```bash
# Submit to TestFlight
eas submit --platform ios --latest

# View submission status
eas submission:view
```

---

## ⚠️ Common Issues & Solutions

### **1. "Map requires a development build"**
- **Cause**: Google Maps API key not configured
- **Solution**: Add GOOGLE_MAPS_API_KEY to eas.json env

### **2. AI missions not generating**
- **Cause**: Environment variables not available in production build
- **Solution**: Add EXPO_PUBLIC_NEWELL_API_URL and EXPO_PUBLIC_PROJECT_ID to eas.json
- **Fallback**: Default missions will still work if AI fails

### **3. Maps show but are blank/grey**
- **Cause**: API key restrictions too strict or wrong API enabled
- **Solution**: Check Google Cloud Console, verify Maps SDK is enabled

### **4. Location not working**
- **Cause**: Permissions not granted or not configured
- **Solution**: Already configured in app.json, user must grant permissions

### **5. Pedometer not working**
- **Cause**: Motion permission not granted
- **Solution**: Already configured in app.json, user must grant permissions in iOS Settings

---

## 📚 Additional Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [Expo Environment Variables](https://docs.expo.dev/build-reference/variables/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Newell AI Documentation](https://newell.fastshot.ai)

---

## 💡 Quick Fix Summary

1. **Get Google Maps API key** from Google Cloud Console
2. **Add to eas.json**:
   ```json
   "env": {
     "GOOGLE_MAPS_API_KEY": "YOUR_KEY_HERE",
     "EXPO_PUBLIC_NEWELL_API_URL": "https://newell.fastshot.ai",
     "EXPO_PUBLIC_PROJECT_ID": "6f21e3fb-3030-44a5-b579-59ee87110735"
   }
   ```
3. **Rebuild** with `eas build --platform ios --profile production`
4. **Submit** with `eas submit --platform ios --latest`

---

**Last Updated**: 2025-12-28
**App Version**: 1.0.0
**Expo SDK**: 54
