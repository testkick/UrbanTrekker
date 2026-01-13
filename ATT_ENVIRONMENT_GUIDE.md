# App Tracking Transparency - Environment Guide

## 📱 Expected Behavior by Environment

This guide shows exactly what you'll see in different development and production environments.

---

## 🧪 Expo Go (No Native Module)

### What Happens:
- ✅ App launches successfully (no crash)
- ✅ All 4 permission cards display
- ✅ Location and motion permissions work normally
- ✅ Tracking request is **silently skipped**
- ✅ App enters main screen

### Console Output:
```
📍 Requesting foreground location permission...
📍 Foreground location permission granted
📍 Requesting motion permission...
📍 Motion permission granted
📍 Requesting background location permission...
📍 Background location permission granted
📊 Checking if App Tracking Transparency is available...
📊 Tracking module not available in this build (Expo Go / dev build without module)
ℹ️ Tracking will be available in production builds with expo-tracking-transparency
📍 Permission flow complete, proceeding to app
```

### User Experience:
1. Sees welcome screen with 4 permission cards
2. Taps "Continue to Adventure"
3. Sees iOS location permission dialog → Grants
4. Sees iOS motion permission dialog → Grants/Denies
5. Sees iOS background location dialog → Grants/Denies
6. **No ATT dialog** (module not available)
7. Enters app successfully

---

## 🛠️ Dev Build (With Native Module)

### What Happens:
- ✅ App launches successfully
- ✅ All 4 permission cards display
- ✅ All permissions work including tracking
- ✅ ATT dialog appears
- ✅ IDFA captured if authorized

### Console Output (User Authorizes):
```
📍 Requesting foreground location permission...
📍 Foreground location permission granted
📍 Requesting motion permission...
📍 Motion permission granted
📍 Requesting background location permission...
📍 Background location permission granted
📊 Checking if App Tracking Transparency is available...
📊 Tracking module available, requesting permission...
📊 Requesting App Tracking Transparency permission...
📊 Tracking permission status: granted
📊 IDFA retrieved: 12345678...
✅ Tracking authorized, IDFA captured and synced
📊 Syncing tracking data to profile for user abc123...
✅ Tracking data synced to user profile
✅ Tracking data synced to profiles table
📊 IDFA: 12345678...
📍 Permission flow complete, proceeding to app
```

### Console Output (User Denies):
```
📍 Requesting foreground location permission...
📍 Foreground location permission granted
📍 Requesting motion permission...
📍 Motion permission granted
📍 Requesting background location permission...
📍 Background location permission granted
📊 Checking if App Tracking Transparency is available...
📊 Tracking module available, requesting permission...
📊 Requesting App Tracking Transparency permission...
📊 Tracking permission status: denied
⚠️ Tracking denied - using anonymous identifier
📊 IDFA: Not available (using anonymous identifier)
📍 Permission flow complete, proceeding to app
```

### User Experience:
1. Sees welcome screen with 4 permission cards
2. Taps "Continue to Adventure"
3. Sees iOS location permission dialog → Grants
4. Sees iOS motion permission dialog → Grants/Denies
5. Sees iOS background location dialog → Grants/Denies
6. **Sees ATT dialog** with custom message
7. Chooses "Allow" or "Ask App Not to Track"
8. Enters app successfully

---

## 🌐 Web Browser

### What Happens:
- ✅ App launches successfully
- ✅ All 4 permission cards display
- ✅ Tracking automatically unavailable (not a crash)
- ✅ Web fallback map displays

### Console Output:
```
📊 Tracking: Not available on Android/Web
📍 Permission flow complete, proceeding to app
```

### User Experience:
1. Sees welcome screen with 4 permission cards
2. Taps "Continue to Adventure"
3. **No permission dialogs** (web doesn't support native permissions)
4. Enters app with web fallback UI

---

## 🤖 Android Device/Emulator

### What Happens:
- ✅ App launches successfully
- ✅ All 4 permission cards display
- ✅ Tracking automatically unavailable (Android doesn't use ATT)
- ✅ Uses Google Play Services Advertising ID instead

### Console Output:
```
📊 Tracking: Not available on Android/Web
📍 Requesting foreground location permission...
📍 Foreground location permission granted
📍 Permission flow complete, proceeding to app
```

### User Experience:
1. Sees welcome screen with 4 permission cards
2. Taps "Continue to Adventure"
3. Sees Android location permission dialog → Grants
4. **No ATT dialog** (Android uses different system)
5. Enters app successfully

---

## 🔍 How to Identify Your Environment

### Check Console for These Messages:

#### Expo Go:
```
📊 Tracking module not available in this environment (Expo Go, dev build without module)
```

#### Dev Build (No Module):
```
📊 Tracking module not available in this build
```

#### Dev Build (With Module):
```
📊 Tracking module available, requesting permission...
```

#### Production Build:
```
📊 Tracking module available, requesting permission...
✅ Tracking authorized, IDFA captured and synced
```

---

## 🎯 Testing Checklist

### Test in Expo Go:
```bash
npx expo start
```
- [ ] App launches without crash
- [ ] 4 permission cards display
- [ ] Location permission works
- [ ] Motion permission works
- [ ] No ATT dialog appears
- [ ] Console shows "Tracking module not available"
- [ ] App enters main screen

### Test in Dev Build:
```bash
npx expo run:ios --device
```
- [ ] App launches without crash
- [ ] 4 permission cards display
- [ ] Location permission works
- [ ] Motion permission works
- [ ] ATT dialog appears
- [ ] Can authorize or deny
- [ ] Console shows IDFA or "denied" status
- [ ] App enters main screen

### Test on Web:
```bash
npx expo start --web
```
- [ ] App launches without crash
- [ ] 4 permission cards display
- [ ] Web fallback map shows
- [ ] Console shows "Not available on Web"
- [ ] App enters main screen

---

## 🐛 Troubleshooting

### "Cannot find native module 'ExpoTrackingTransparency'"

**Cause**: Top-level import in code that runs in Expo Go

**Solution**: ✅ Already fixed! We now use dynamic imports.

**Verify Fix**:
```bash
# Should find NO direct imports
grep -r "import.*TrackingTransparency" services/ hooks/ components/
# Should return empty or only show dynamic imports
```

---

### ATT Dialog Not Appearing (Dev Build)

**Possible Causes**:
1. ❌ Module not installed in dev build
2. ❌ iOS version < 14
3. ❌ Already decided in settings
4. ❌ Running on simulator (may behave differently)

**Solutions**:
```bash
# 1. Rebuild with module
npx expo prebuild --clean
npx expo run:ios

# 2. Reset permissions
Settings → Privacy → Tracking → Reset

# 3. Test on real device (iOS 14+)
```

---

### Module Shows as Unavailable in Production

**Check**:
1. `app.json` has `expo-tracking-transparency` in dependencies
2. `NSUserTrackingUsageDescription` is in Info.plist
3. Built with `npx expo prebuild` (not just Expo Go)
4. Testing on iOS 14+ device

**Verify**:
```bash
# Check app.json
grep "expo-tracking-transparency" package.json

# Check Info.plist (after prebuild)
grep "NSUserTrackingUsageDescription" ios/*/Info.plist
```

---

## 📊 Environment Detection Helper

Add this to your code for debugging:

```typescript
import { isTrackingAvailable } from '@/services/trackingService';
import { Platform } from 'react-native';

const detectEnvironment = async () => {
  const trackingAvailable = await isTrackingAvailable();

  console.log('🔍 Environment Detection:');
  console.log(`  Platform: ${Platform.OS}`);
  console.log(`  Tracking Module: ${trackingAvailable ? 'Available' : 'Not Available'}`);

  if (Platform.OS === 'ios' && !trackingAvailable) {
    console.log('  → Running in Expo Go or dev build without expo-tracking-transparency');
  }

  if (Platform.OS === 'ios' && trackingAvailable) {
    console.log('  → Running in dev/production build with expo-tracking-transparency');
  }

  if (Platform.OS !== 'ios') {
    console.log('  → Tracking not applicable for this platform');
  }
};

// Call on app launch
detectEnvironment();
```

---

## 🎨 UI Behavior Summary

| Environment | Cards Shown | ATT Dialog | App Works? |
|-------------|-------------|------------|------------|
| **Expo Go** | 4 cards | ❌ No | ✅ Yes |
| **Dev Build (no module)** | 4 cards | ❌ No | ✅ Yes |
| **Dev Build (with module)** | 4 cards | ✅ Yes | ✅ Yes |
| **Production** | 4 cards | ✅ Yes | ✅ Yes |
| **Web** | 4 cards | ❌ No | ✅ Yes |
| **Android** | 4 cards | ❌ No | ✅ Yes |

**Key Takeaway**: The app is **stable and functional in all environments**, with tracking gracefully unavailable when the module isn't present.

---

## 📝 Quick Reference Commands

```bash
# Check if tracking imports are safe
grep -r "import.*TrackingTransparency" services/ hooks/ components/

# Run in Expo Go (no tracking)
npx expo start

# Build and run with tracking
npx expo prebuild
npx expo run:ios

# Check TypeScript
npx tsc --noEmit

# Check ESLint
npm run lint

# Clean and rebuild
npx expo prebuild --clean
rm -rf ios android
npx expo prebuild
npx expo run:ios
```

---

**Status**: ✅ **All Environments Stable**

You can now develop and test in any environment without crashes!
