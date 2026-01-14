# App Tracking Transparency - Usage Examples

## 🎯 How to Use Tracking in Your App

### 1. **Check Tracking Status (Simple)**

```typescript
import { useTracking } from '@/hooks/useTracking';

export const MyComponent = () => {
  const { isAuthorized, status, idfa } = useTracking();

  return (
    <View>
      {isAuthorized ? (
        <Text>🎯 Personalized missions enabled!</Text>
      ) : (
        <Text>🔒 Using anonymous mode</Text>
      )}
    </View>
  );
};
```

---

### 2. **Conditional Analytics Features**

```typescript
import { useTracking } from '@/hooks/useTracking';

export const MissionGenerator = () => {
  const { isAuthorized, idfa } = useTracking();
  const [missions, setMissions] = useState([]);

  const generateMissions = async () => {
    // Include IDFA for personalized recommendations if authorized
    const params = {
      location: currentLocation,
      preferences: userPreferences,
      ...(isAuthorized && { idfa }), // Only include if authorized
    };

    const result = await fetchMissions(params);
    setMissions(result);
  };

  return (
    <View>
      <Button onPress={generateMissions}>
        Generate {isAuthorized ? 'Personalized' : 'Random'} Missions
      </Button>
    </View>
  );
};
```

---

### 3. **Cross-Device Journey Sync**

```typescript
import { useTracking } from '@/hooks/useTracking';
import { supabase } from '@/lib/supabase';

export const useCrossDeviceSync = () => {
  const { isAuthorized, idfa } = useTracking();

  const syncProgress = async () => {
    if (!isAuthorized || !idfa) {
      console.log('Using device-specific storage');
      return;
    }

    // Sync journey progress across devices using IDFA
    const { data, error } = await supabase
      .from('journey_progress')
      .upsert({
        idfa: idfa,
        steps_today: currentSteps,
        missions_completed: completedMissions,
        last_location: currentLocation,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Sync failed:', error);
    } else {
      console.log('✅ Progress synced across devices');
    }
  };

  return { syncProgress };
};
```

---

### 4. **Privacy-Aware Analytics**

```typescript
import { useTracking } from '@/hooks/useTracking';

export const useAnalytics = () => {
  const { isAuthorized, idfa, status } = useTracking();

  const logEvent = (eventName: string, properties?: object) => {
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        tracking_status: status,
        // Only include IDFA if authorized
        ...(isAuthorized && { idfa }),
      },
    };

    // Send to analytics service
    console.log('📊 Analytics Event:', payload);
  };

  return { logEvent };
};

// Usage
const analytics = useAnalytics();
analytics.logEvent('mission_completed', {
  mission_id: 'abc123',
  steps: 1500,
});
```

---

### 5. **Show Tracking Preference in Settings**

```typescript
import { useTracking } from '@/hooks/useTracking';
import { Linking } from 'react-native';

export const PrivacySettings = () => {
  const { status, isAuthorized, recheckTracking } = useTracking();

  const openIOSSettings = () => {
    Linking.openSettings();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privacy & Tracking</Text>

      <View style={styles.statusCard}>
        <Text style={styles.label}>Tracking Status:</Text>
        <Text style={styles.value}>
          {status === 'authorized' ? '✅ Authorized' :
           status === 'denied' ? '🔒 Not Tracking' :
           status === 'restricted' ? '⚠️ Restricted' :
           'ℹ️ Unavailable'}
        </Text>
      </View>

      {!isAuthorized && Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.changeButton}
          onPress={openIOSSettings}
        >
          <Text style={styles.buttonText}>
            Change in iOS Settings
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={recheckTracking}
      >
        <Text style={styles.buttonText}>Refresh Status</Text>
      </TouchableOpacity>

      <Text style={styles.description}>
        {isAuthorized
          ? 'Your data helps us provide personalized mission recommendations and sync your progress across devices.'
          : 'You\'re using anonymous mode. All features work, but mission recommendations may be less personalized.'}
      </Text>
    </View>
  );
};
```

---

### 6. **A/B Testing with Tracking**

```typescript
import { useTracking } from '@/hooks/useTracking';

export const useFeatureFlag = (featureName: string) => {
  const { isAuthorized, idfa } = useTracking();

  // Use IDFA for consistent A/B testing across devices
  const getUserVariant = () => {
    if (!isAuthorized || !idfa) {
      // Fallback to random assignment for anonymous users
      return Math.random() < 0.5 ? 'A' : 'B';
    }

    // Hash IDFA to get consistent variant
    const hash = idfa.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return Math.abs(hash) % 2 === 0 ? 'A' : 'B';
  };

  const variant = getUserVariant();

  return {
    variant,
    isVariantA: variant === 'A',
    isVariantB: variant === 'B',
  };
};

// Usage
export const MissionCard = ({ mission }) => {
  const { isVariantA } = useFeatureFlag('new_card_design');

  return isVariantA ? (
    <NewMissionCard mission={mission} />
  ) : (
    <OldMissionCard mission={mission} />
  );
};
```

---

### 7. **Export User Data (GDPR Compliance)**

```typescript
import { useTracking } from '@/hooks/useTracking';
import { supabase } from '@/lib/supabase';

export const useDataExport = () => {
  const { status, idfa } = useTracking();

  const exportUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const userData = {
      user_id: user.id,
      email: user.email,
      tracking_preferences: {
        status: status,
        idfa: idfa || 'not_available',
        updated_at: user.user_metadata?.tracking_updated_at,
      },
      missions: await fetchUserMissions(user.id),
      steps: await fetchUserSteps(user.id),
      created_at: user.created_at,
    };

    // Generate downloadable file
    const jsonData = JSON.stringify(userData, null, 2);
    return jsonData;
  };

  return { exportUserData };
};
```

---

### 8. **Personalized Mission Recommendations**

```typescript
import { useTracking } from '@/hooks/useTracking';

export const useMissionRecommendations = () => {
  const { isAuthorized, idfa } = useTracking();

  const fetchRecommendations = async (location: Location) => {
    // Build recommendation request
    const requestBody = {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      user_preferences: {
        difficulty: 'medium',
        distance: 'short',
      },
      // Include IDFA for personalization if available
      ...(isAuthorized && {
        personalization: {
          idfa: idfa,
          enable_history_based: true,
        },
      }),
    };

    const response = await fetch('/api/missions/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    return response.json();
  };

  return {
    fetchRecommendations,
    isPersonalized: isAuthorized,
  };
};
```

---

## 🔐 Privacy Best Practices

### DO ✅

- Check `isAuthorized` before using IDFA
- Provide value in exchange for tracking (personalization, sync, etc.)
- Handle all tracking statuses gracefully
- Store tracking status in Supabase for server-side logic
- Respect user's choice - never degrade core functionality
- Show current tracking status in app settings

### DON'T ❌

- Don't gate core features behind tracking authorization
- Don't repeatedly prompt users who denied tracking
- Don't use IDFA without checking `isAuthorized` first
- Don't show tracking permission before onboarding context
- Don't store IDFA in plain text in local storage
- Don't forget to handle 'restricted' and 'unavailable' states

---

## 🧪 Testing Helpers

### Development Mode Check

```typescript
// Add to your app for easier testing
const TrackingDebugPanel = () => {
  const { status, idfa, recheckTracking } = useTracking();

  if (!__DEV__) return null; // Only show in dev mode

  return (
    <View style={styles.debugPanel}>
      <Text>📊 Tracking Debug</Text>
      <Text>Status: {status}</Text>
      <Text>IDFA: {idfa ? `${idfa.substring(0, 8)}...` : 'N/A'}</Text>
      <Button title="Recheck" onPress={recheckTracking} />
    </View>
  );
};
```

### Manual Testing Commands

```typescript
// In console or debug screen
import * as TrackingService from '@/services/trackingService';

// Check current status
const status = await TrackingService.getTrackingStatus();
console.log('Status:', status);

// Force sync to Supabase
await TrackingService.syncTrackingToProfile(status);

// Request permission again (won't show dialog if already decided)
const result = await TrackingService.requestTracking();
console.log('Result:', result);
```

---

## 📚 Additional Resources

- [Apple App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency)
- [Expo Tracking Transparency](https://docs.expo.dev/versions/latest/sdk/tracking-transparency/)
- [Supabase Auth Metadata](https://supabase.com/docs/guides/auth/auth-metadata)

---

**Happy Coding!** 🎉
