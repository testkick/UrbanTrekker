# App Tracking Transparency - Permission Flow Diagram

## 📱 User Journey Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    App Launch                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Permission Gateway Screen                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  🥾 Welcome to Stepquest                              │  │
│  │  Your Urban Adventure Awaits                          │  │
│  │                                                        │  │
│  │  📍 Location Access                                   │  │
│  │  👣 Motion & Fitness                                  │  │
│  │  📱 Background Tracking                               │  │
│  │  📊 Personalized Journey [NEW]                        │  │
│  │                                                        │  │
│  │         [Continue to Adventure] ←── User taps         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: iOS Location Permission Dialog                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ "Stepquest" Would Like to Access Your Location       │  │
│  │                                                        │  │
│  │ [ Allow Once ]  [ Allow While Using ]  [ Don't Allow ]│  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  Granted?     │
                    └───────────────┘
                      ↙           ↘
                 YES                   NO
                  ↓                     ↓
                                   ┌──────────────┐
                                   │ Show Alert   │
                                   │ "Location    │
                                   │  Required"   │
                                   └──────────────┘
                                        ↓
                                    [Return]
                  ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: iOS Motion Permission Dialog                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ "Stepquest" Would Like to Access Motion & Fitness    │  │
│  │                                                        │  │
│  │            [ OK ]           [ Don't Allow ]           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  Granted?     │
                    └───────────────┘
                      ↙           ↘
                 YES                   NO
                  ↓                     ↓
              [Continue]          ┌──────────────┐
                                  │ Show Alert   │
                                  │ "Optional"   │
                                  │ [Continue]   │
                                  └──────────────┘
                  ↓                     ↓
                  └──────────┬──────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: iOS Background Location Dialog (iOS only)          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Allow "Stepquest" to access your location?            │  │
│  │                                                        │  │
│  │ [ Change to Always Allow ]  [ Keep "While Using" ]   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  Always?      │
                    └───────────────┘
                      ↙           ↘
                 YES                   NO
                  ↓                     ↓
              [Continue]          ┌──────────────┐
                                  │ Show Alert   │
                                  │ "Optional"   │
                                  │ [Continue]   │
                                  └──────────────┘
                  ↓                     ↓
                  └──────────┬──────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: App Tracking Transparency Dialog (iOS 14+)         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Allow "Stepquest" to track your activity              │  │
│  │ across other companies' apps and websites?            │  │
│  │                                                        │  │
│  │ Stepquest uses your data to provide more accurate    │  │
│  │ local mission suggestions and to sync your           │  │
│  │ exploration progress across your devices. Your       │  │
│  │ privacy is always protected.                         │  │
│  │                                                        │  │
│  │      [ Ask App Not to Track ]    [ Allow ]           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  Allow?       │
                    └───────────────┘
                      ↙           ↘
                 YES                   NO
                  ↓                     ↓
         ┌──────────────────┐   ┌─────────────────┐
         │ ✅ IDFA Captured │   │ ⚠️ Anonymous ID │
         │ Sync to Supabase │   │ App continues   │
         │ tracking_status: │   │ tracking_status:│
         │  "authorized"    │   │   "denied"      │
         └──────────────────┘   └─────────────────┘
                  ↓                     ↓
                  └──────────┬──────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ✨ Main App Screen ✨                           │
│                                                              │
│  User enters the app with full functionality                │
│  - All features work regardless of tracking choice          │
│  - Location-based missions available                        │
│  - Step tracking active                                     │
│  - Journey progress synced to Supabase                      │
│  - Personalized missions (if tracking authorized)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Status Handling Matrix

| User Choice | IDFA | Supabase Status | App Behavior |
|-------------|------|-----------------|--------------|
| **Allow Tracking** | ✅ Captured | `authorized` | Full personalization + analytics |
| **Don't Track** | ❌ null | `denied` | Anonymous ID, all features work |
| **Restricted** | ❌ null | `restricted` | Anonymous ID, all features work |
| **iOS < 14** | ❌ null | `unavailable` | Anonymous ID, all features work |
| **Android** | ❌ null | `unavailable` | Device ID, all features work |

---

## 📊 Console Log Sequence (Successful Flow)

```
📍 Permission flow starting...
📍 Requesting foreground location permission...
📍 Foreground location permission granted
📍 Requesting motion permission...
📍 Motion permission granted
📍 Requesting background location permission...
📍 Background location permission granted
📊 Requesting App Tracking Transparency...
📊 Tracking permission status: granted
📊 IDFA retrieved: 12345678...
✅ Tracking authorized, IDFA captured and synced
📊 Syncing tracking data to profile for user abc123...
✅ Tracking data synced to user profile
✅ Tracking data synced to profiles table
📊 IDFA: 12345678...
📍 Permission flow complete, proceeding to app
```

---

## 🎯 Key Principles

1. **Sequential, Not Parallel**: Each permission requested one after another
2. **Required First**: Essential permissions (location) before optional ones
3. **ATT Last**: Tracking permission requested after all iOS system permissions
4. **Graceful Degradation**: App continues if any optional permission denied
5. **No Surprises**: All permissions explained before requesting
6. **User Control**: Respects all user choices without penalty

---

## 🛠️ Debugging Commands

```bash
# Check if tracking is authorized
await getTrackingStatus()

# Request tracking permission
await requestTracking()

# Sync current status to Supabase
await syncTrackingToProfile(trackingResult)

# Use the React hook
const { status, idfa, isAuthorized } = useTracking()
```

---

## 📱 Testing on Device

1. **Reset Tracking Permission**:
   - Settings → Privacy → Tracking
   - Toggle off "Allow Apps to Request to Track"
   - Delete and reinstall app

2. **Test All Paths**:
   - Allow tracking → Verify IDFA in Supabase
   - Deny tracking → Verify app continues
   - Device restricted → Verify graceful handling

3. **Check Supabase**:
   ```sql
   SELECT
     id,
     raw_user_meta_data->>'tracking_status' as tracking_status,
     raw_user_meta_data->>'idfa' as idfa
   FROM auth.users;
   ```

---

**Ready for Production** ✅
