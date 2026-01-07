import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWalkingDirections } from '@/services/googleDirections';
import { findNearestPOI } from '@/services/googlePlaces';

interface DiagnosticPanelProps {
  isVisible: boolean;
  onClose: () => void;
  currentLocation?: { latitude: number; longitude: number };
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
  error?: string;
  details?: string;
}

/**
 * Diagnostic Panel for testing Google Maps API connectivity
 * Accessible via long-press on "Scan Area" button
 */
export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  isVisible,
  onClose,
  currentLocation,
}) => {
  const insets = useSafeAreaInsets();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([
    { name: 'Environment Variable Check', status: 'pending' },
    { name: 'Google Directions API', status: 'pending' },
    { name: 'Google Places API', status: 'pending' },
  ]);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
    }
  }, [isVisible, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Run all diagnostic tests
  const runDiagnostics = async () => {
    setIsRunning(true);
    const newResults: TestResult[] = [];

    // Test 1: Environment Variable Check
    newResults.push({
      name: 'Environment Variable Check',
      status: 'running',
    });
    setResults([...newResults]);

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      newResults[0] = {
        name: 'Environment Variable Check',
        status: 'success',
        message: 'API key found',
        details: `Key starts with: ${apiKey.substring(0, 15)}...`,
      };
    } else {
      newResults[0] = {
        name: 'Environment Variable Check',
        status: 'failed',
        message: 'API key not found',
        error: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not defined in environment variables',
        details: 'Please add the key to eas.json and rebuild the app',
      };
    }
    setResults([...newResults]);

    // Test 2: Google Directions API
    newResults.push({
      name: 'Google Directions API',
      status: 'running',
    });
    setResults([...newResults]);

    try {
      // Test with Vancouver coordinates (hardcoded 100m span)
      const origin = { latitude: 49.2827, longitude: -123.1207 };
      const destination = { latitude: 49.2837, longitude: -123.1207 };

      const directionsResult = await getWalkingDirections(origin, destination);

      if (directionsResult.success) {
        newResults[1] = {
          name: 'Google Directions API',
          status: 'success',
          message: 'Successfully fetched walking route',
          details: `Route has ${directionsResult.path?.length || 0} points, ${directionsResult.distance}m, ${directionsResult.duration}s`,
        };
      } else {
        newResults[1] = {
          name: 'Google Directions API',
          status: 'failed',
          message: 'API request failed',
          error: directionsResult.error || 'Unknown error',
          details: parseGoogleError(directionsResult.error || ''),
        };
      }
    } catch (error) {
      newResults[1] = {
        name: 'Google Directions API',
        status: 'failed',
        message: 'Request exception',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Network error or invalid response',
      };
    }
    setResults([...newResults]);

    // Test 3: Google Places API
    newResults.push({
      name: 'Google Places API',
      status: 'running',
    });
    setResults([...newResults]);

    try {
      // Use current location or fallback to Vancouver
      const searchLocation = currentLocation || { latitude: 49.2827, longitude: -123.1207 };

      const placesResult = await findNearestPOI(searchLocation, 'cafe', 1000);

      if (placesResult.success && placesResult.poi) {
        newResults[2] = {
          name: 'Google Places API',
          status: 'success',
          message: 'Successfully found nearby cafes',
          details: `Found: ${placesResult.poi.name} at ${placesResult.poi.address}`,
        };
      } else {
        newResults[2] = {
          name: 'Google Places API',
          status: 'failed',
          message: 'API request failed',
          error: placesResult.error || 'No results found',
          details: parseGoogleError(placesResult.error || ''),
        };
      }
    } catch (error) {
      newResults[2] = {
        name: 'Google Places API',
        status: 'failed',
        message: 'Request exception',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Network error or invalid response',
      };
    }

    setResults([...newResults]);
    setIsRunning(false);
  };

  // Parse Google API error messages and provide helpful guidance
  const parseGoogleError = (errorMessage: string): string => {
    const errorLower = errorMessage.toLowerCase();

    if (errorLower.includes('request_denied') || errorLower.includes('request denied')) {
      return '🔧 Fix: Enable this API in Google Cloud Console → APIs & Services → Library';
    }
    if (errorLower.includes('invalid_request') || errorLower.includes('invalid request')) {
      return '🔧 Fix: Check API parameters or endpoint configuration';
    }
    if (errorLower.includes('over_query_limit') || errorLower.includes('over query limit')) {
      return '🔧 Fix: API quota exceeded. Check billing in Google Cloud Console';
    }
    if (errorLower.includes('unknown_error') || errorLower.includes('unknown error')) {
      return '🔧 Fix: Server error. Try again in a few moments';
    }
    if (errorLower.includes('zero_results') || errorLower.includes('zero results')) {
      return 'ℹ️ No results found for search criteria (this is normal in some locations)';
    }
    if (errorLower.includes('not_found') || errorLower.includes('not found')) {
      return '🔧 Fix: Invalid location or place ID';
    }

    return 'Check Google Cloud Console to ensure API is enabled and key restrictions are correct';
  };

  // Copy diagnostic logs to clipboard
  const copyLogs = () => {
    const timestamp = new Date().toISOString();
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    const logs = `
═══════════════════════════════════
📊 URBAN EXPLORER - API DIAGNOSTICS
═══════════════════════════════════

Timestamp: ${timestamp}
API Key Present: ${apiKey ? 'Yes' : 'No'}
${apiKey ? `Key Preview: ${apiKey.substring(0, 20)}...` : ''}

${results
  .map(
    (result, index) => `
─────────────────────────────────
Test ${index + 1}: ${result.name}
Status: ${result.status.toUpperCase()}
${result.message ? `Message: ${result.message}` : ''}
${result.error ? `Error: ${result.error}` : ''}
${result.details ? `Details: ${result.details}` : ''}
`
  )
  .join('\n')}

═══════════════════════════════════
📋 TROUBLESHOOTING CHECKLIST
═══════════════════════════════════

1. ✅ Verify APIs are enabled in Google Cloud Console:
   - Maps SDK for iOS
   - Maps SDK for Android
   - Directions API
   - Places API (New)

2. ✅ Check API key restrictions:
   - Application restrictions match your bundle ID
   - API restrictions include all required APIs

3. ✅ Confirm billing is enabled in Google Cloud Console

4. ✅ Verify EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is in eas.json

5. ✅ Rebuild the app after adding environment variables
`;

    Clipboard.setString(logs);
    Alert.alert('Copied!', 'Diagnostic logs copied to clipboard', [{ text: 'OK' }]);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color="#00E676" />;
      case 'failed':
        return <Ionicons name="close-circle" size={24} color="#FF5252" />;
      case 'running':
        return <ActivityIndicator size="small" color="#00B0FF" />;
      default:
        return <Ionicons name="ellipse-outline" size={24} color="#666" />;
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      {/* Diagnostic Panel */}
      <Animated.View
        style={[
          styles.panel,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          animatedStyle,
        ]}
      >
        <BlurView intensity={95} tint="dark" style={styles.panelBlur}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="bug" size={24} color="#00B0FF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>API Diagnostics</Text>
              <Text style={styles.headerSubtitle}>Testing Google Maps APIs</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Results */}
          <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
            {results.map((result, index) => (
              <View key={index} style={styles.testItem}>
                <View style={styles.testHeader}>
                  <View style={styles.statusIcon}>{getStatusIcon(result.status)}</View>
                  <Text style={styles.testName}>{result.name}</Text>
                </View>

                {result.message && (
                  <Text style={styles.testMessage}>{result.message}</Text>
                )}

                {result.error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={16} color="#FF5252" />
                    <Text style={styles.errorText}>{result.error}</Text>
                  </View>
                )}

                {result.details && (
                  <Text style={styles.detailsText}>{result.details}</Text>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={runDiagnostics}
              disabled={isRunning}
              style={({ pressed }) => [
                styles.actionButton,
                styles.runButton,
                pressed && styles.buttonPressed,
                isRunning && styles.buttonDisabled,
              ]}
            >
              {isRunning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="play" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.actionButtonText}>
                {isRunning ? 'Running Tests...' : 'Run Tests'}
              </Text>
            </Pressable>

            <Pressable
              onPress={copyLogs}
              style={({ pressed }) => [
                styles.actionButton,
                styles.copyButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="copy-outline" size={20} color="#00B0FF" />
              <Text style={[styles.actionButtonText, styles.copyButtonText]}>
                Copy Logs
              </Text>
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  panelBlur: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 176, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#A0A0B0',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  testItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    marginRight: 12,
  },
  testName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testMessage: {
    fontSize: 14,
    color: '#C0C0D0',
    marginLeft: 36,
    marginBottom: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 36,
    marginTop: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5252',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FF8A80',
    marginLeft: 8,
    fontWeight: '500',
  },
  detailsText: {
    fontSize: 12,
    color: '#00B0FF',
    marginLeft: 36,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  runButton: {
    backgroundColor: '#00B0FF',
  },
  copyButton: {
    backgroundColor: 'rgba(0, 176, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00B0FF',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  copyButtonText: {
    color: '#00B0FF',
  },
});

export default DiagnosticPanel;
