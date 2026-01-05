# 🚨 Quick Fix Guide - Maps & AI Not Working in TestFlight

## Problem Summary
- **Maps**: Not loading or showing "Map requires a development build"
- **AI Missions**: Not generating (but default missions should still work)

## Root Cause
Environment variables from `.env` file are **NOT included** in production builds automatically.

---

## ⚡ Quick Fix (5 Minutes)

### **Step 1: Get Google Maps API Key**

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Maps SDK for iOS** and **Maps SDK for Android**
3. Create an API key (or use existing one)
4. Copy the key

### **Step 2: Update eas.json**

Open `/workspace/eas.json` and replace `REPLACE_WITH_YOUR_GOOGLE_MAPS_KEY` with your actual key:

```json
"GOOGLE_MAPS_API_KEY": "AIzaSyC_YOUR_ACTUAL_KEY_HERE"
```

**✅ The Newell AI variables are already configured!**
- `EXPO_PUBLIC_NEWELL_API_URL`: Already set to `https://newell.fastshot.ai`
- `EXPO_PUBLIC_PROJECT_ID`: Already set to your project ID

### **Step 3: Rebuild & Deploy**

```bash
# Rebuild for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight when build completes
eas submit --platform ios --latest
```

---

## 🔍 Where to Insert API Keys

### **In `/workspace/eas.json`**

Find these two locations and replace `REPLACE_WITH_YOUR_GOOGLE_MAPS_KEY`:

**Line 20 (preview profile):**
```json
"preview": {
  "distribution": "internal",
  "env": {
    "EXPO_PUBLIC_NEWELL_API_URL": "https://newell.fastshot.ai",
    "EXPO_PUBLIC_PROJECT_ID": "6f21e3fb-3030-44a5-b579-59ee87110735",
    "GOOGLE_MAPS_API_KEY": "REPLACE_WITH_YOUR_GOOGLE_MAPS_KEY"  // ← REPLACE HERE
  }
}
```

**Line 31 (production profile):**
```json
"production": {
  "autoIncrement": true,
  "env": {
    "EXPO_PUBLIC_NEWELL_API_URL": "https://newell.fastshot.ai",
    "EXPO_PUBLIC_PROJECT_ID": "6f21e3fb-3030-44a5-b579-59ee87110735",
    "GOOGLE_MAPS_API_KEY": "REPLACE_WITH_YOUR_GOOGLE_MAPS_KEY"  // ← REPLACE HERE
  }
}
```

---

## 🔐 Secure API Keys (Recommended)

For better security, use EAS secrets instead of hardcoding:

```bash
# Set Google Maps key as secret
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value "YOUR_KEY_HERE" --type string

# Then in eas.json, reference it:
"GOOGLE_MAPS_API_KEY": "$GOOGLE_MAPS_API_KEY"
```

---

## ✅ Verify Configuration

### **Current State (After Fix)**

Your `eas.json` now includes:
- ✅ `EXPO_PUBLIC_NEWELL_API_URL` = `https://newell.fastshot.ai`
- ✅ `EXPO_PUBLIC_PROJECT_ID` = `6f21e3fb-3030-44a5-b579-59ee87110735`
- ⚠️ `GOOGLE_MAPS_API_KEY` = **NEEDS YOUR KEY**

### **Your `app.json` Already Has Correct Placeholders**

**iOS (Line 24):**
```json
"config": {
  "googleMapsApiKey": "$(GOOGLE_MAPS_API_KEY)"
}
```

**Android (Lines 44-47):**
```json
"config": {
  "googleMaps": {
    "apiKey": "$(GOOGLE_MAPS_API_KEY)"
  }
}
```

These `$(VARIABLE)` placeholders are automatically replaced during EAS build.

---

## 🤖 AI Mission Generation Fallback

### **How It Works**

The app has **3 layers of fallback** in `services/missionGenerator.ts`:

1. **Primary**: AI generates custom missions via Newell API
2. **Fallback 1**: If AI call fails → returns default missions
3. **Fallback 2**: If JSON parsing fails → returns default missions
4. **Fallback 3**: If everything fails → still returns 3 themed missions

**Example Default Missions:**
- 🌅 "The Morning Stroll" - Chill vibe, 1000 steps
- 🔍 "Urban Explorer's Path" - Discovery vibe, 2500 steps
- 💪 "The Endurance Trial" - Workout vibe, 5000 steps

### **Why AI Might Not Be Working**

If `EXPO_PUBLIC_NEWELL_API_URL` or `EXPO_PUBLIC_PROJECT_ID` are missing, the AI call will fail **silently** and return defaults.

**✅ Fixed**: These variables are now in `eas.json` and will be available in production builds.

---

## 📋 Pre-Deployment Checklist

Before running `eas build`:

- [ ] Google Maps API key obtained
- [ ] Google Maps API key added to `eas.json` (replace placeholder)
- [ ] Maps SDK for iOS enabled in Google Cloud Console
- [ ] Maps SDK for Android enabled in Google Cloud Console
- [ ] API key restrictions configured (optional but recommended)
- [ ] Newell AI variables confirmed in `eas.json` ✅ (already done)

---

## 🧪 Testing After Fix

### **Test Maps**
1. Open app in TestFlight
2. Grant location permissions
3. Map should show styled map tiles (beige/brown theme)
4. Your location should appear as a pulsing orange marker

### **Test AI Missions**
1. Tap "Scan Area" button at bottom
2. Should see scanning animation
3. After ~3-5 seconds, 3 mission cards should appear
4. Missions should have location-based descriptions (if AI is working)
5. If AI fails, you'll still see default themed missions

---

## 🆘 Still Not Working?

### **Maps Still Broken**
1. Check Google Cloud Console → APIs are enabled
2. Verify bundle identifier matches: `com.glougheed.stepquest`
3. Check API key restrictions aren't blocking requests
4. Review EAS build logs for errors: `eas build:view --id <build-id>`

### **AI Still Using Defaults**
1. Check network connectivity in TestFlight
2. Verify Newell API is reachable: `curl https://newell.fastshot.ai`
3. Check build logs for "Mission generation error"
4. **Remember**: Defaults are perfectly functional!

---

## 📖 Full Documentation

See `PRODUCTION_CHECKLIST.md` for complete details on:
- Google Maps API key setup
- API key restrictions for security
- Android SHA-1 fingerprint configuration
- EAS secrets management
- Debugging production issues

---

**Last Updated**: 2025-12-28
**Estimated Fix Time**: 5-10 minutes
**Next Build Time**: ~15-20 minutes for iOS
