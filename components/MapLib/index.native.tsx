/**
 * MapLib - Native Map Implementation
 * This file is loaded on iOS/Android
 * Uses extremely lazy loading to avoid TurboModule crashes in Expo Go
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, ViewStyle } from 'react-native';

// Safely check if we're in Expo Go - must be done synchronously at module load
let isExpoGo = true; // Default to true for safety
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Constants = require('expo-constants').default;
  isExpoGo = Constants?.appOwnership === 'expo';
} catch {
  // If we can't determine, assume Expo Go for safety
  isExpoGo = true;
}

// Fallback component when map isn't available
const MapFallback: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.fallbackContainer, style]}>
    <Text style={styles.fallbackText}>Map requires a development build</Text>
    <Text style={styles.fallbackSubtext}>
      Run `npx expo run:ios` or `npx expo run:android` to use maps
    </Text>
  </View>
);

// Placeholder Marker that renders children
const PlaceholderMarker: React.FC<{ children?: React.ReactNode; [key: string]: unknown }> = ({ children }) => <>{children}</>;

// Placeholder Polyline that renders nothing
const PlaceholderPolyline: React.FC<Record<string, unknown>> = () => null;

// Type for the cached maps module
type MapsModule = {
  default: React.ComponentType<Record<string, unknown>>;
  Marker: React.ComponentType<Record<string, unknown>>;
  Polyline: React.ComponentType<Record<string, unknown>>;
  PROVIDER_GOOGLE: string | undefined;
};

// Cache for lazy-loaded maps module
let cachedMaps: MapsModule | null = null;
let loadAttempted = false;
let loadSuccessful = false;

// Load maps ONLY in dev builds - this function is never called in Expo Go
const loadMapsModule = (): MapsModule | null => {
  if (loadAttempted) {
    return loadSuccessful ? cachedMaps : null;
  }

  loadAttempted = true;

  // This code path should NEVER be reached in Expo Go
  // because we check isExpoGo before calling this function
  try {
    // Dynamic require wrapped in eval to prevent Metro from statically analyzing it
    // This is the safest way to avoid TurboModule initialization in Expo Go
    const maps = eval('require')('react-native-maps') as MapsModule;
    cachedMaps = maps;
    loadSuccessful = true;
    return maps;
  } catch (error) {
    console.warn('Failed to load react-native-maps:', error);
    loadSuccessful = false;
    return null;
  }
};

// Safe getter that respects Expo Go check
const getMaps = (): MapsModule | null => {
  // NEVER try to load maps in Expo Go
  if (isExpoGo) {
    return null;
  }
  return loadMapsModule();
};

// MapView component with lazy loading
const MapView = React.forwardRef<View, Record<string, unknown>>((props, ref) => {
  const { style, children, onMapReady, ...rest } = props;
  const [RNMapView, setRNMapView] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const internalRef = useRef<View>(null);

  const viewStyle = style as ViewStyle | undefined;

  // Load the map component
  useEffect(() => {
    // In Expo Go, immediately show fallback
    if (isExpoGo) {
      setIsReady(true);
      // Call onMapReady for Expo Go fallback
      if (onMapReady && typeof onMapReady === 'function') {
        setTimeout(() => (onMapReady as () => void)(), 100);
      }
      return;
    }

    // Only load maps in development builds
    const maps = getMaps();
    if (maps?.default) {
      setRNMapView(() => maps.default);
    }
    setIsReady(true);
  }, [onMapReady]);

  // Forward ref
  useEffect(() => {
    if (ref && internalRef.current) {
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else {
        (ref as React.MutableRefObject<View | null>).current = internalRef.current;
      }
    }
  }, [ref, RNMapView]);

  const handleMapReady = useCallback(() => {
    if (onMapReady && typeof onMapReady === 'function') {
      (onMapReady as () => void)();
    }
  }, [onMapReady]);

  // Loading state
  if (!isReady) {
    return (
      <View style={[styles.fallbackContainer, viewStyle]}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Fallback when maps not available (Expo Go or error)
  if (!RNMapView) {
    return <MapFallback style={viewStyle} />;
  }

  const ActualMapView = RNMapView;

  return (
    <ActualMapView
      ref={internalRef}
      style={style}
      onMapReady={handleMapReady}
      {...rest}
    >
      {children}
    </ActualMapView>
  );
});

MapView.displayName = 'MapView';

// Define prop types for Marker
interface MarkerProps {
  children?: React.ReactNode;
  coordinate?: {
    latitude: number;
    longitude: number;
  };
  anchor?: { x: number; y: number };
  flat?: boolean;
  [key: string]: unknown;
}

// Marker wrapper that loads the actual Marker lazily
const Marker: React.FC<MarkerProps> = (props) => {
  const { children, ...rest } = props;
  const ActualMarker = useMemo(() => {
    if (isExpoGo) return PlaceholderMarker;
    const maps = getMaps();
    if (maps?.Marker) {
      return maps.Marker as React.ComponentType<Record<string, unknown>>;
    }
    return PlaceholderMarker;
  }, []);

  return <ActualMarker {...rest}>{children}</ActualMarker>;
};

// Define prop types for Polyline
interface PolylineProps {
  coordinates: {
    latitude: number;
    longitude: number;
  }[];
  strokeColor?: string;
  strokeWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  lineDashPattern?: number[];
  geodesic?: boolean;
  [key: string]: unknown;
}

// Polyline wrapper that loads the actual Polyline lazily
const Polyline: React.FC<PolylineProps> = (props) => {
  const ActualPolyline = useMemo(() => {
    if (isExpoGo) return PlaceholderPolyline;
    const maps = getMaps();
    if (maps?.Polyline) {
      return maps.Polyline as React.ComponentType<Record<string, unknown>>;
    }
    return PlaceholderPolyline;
  }, []);

  return <ActualPolyline {...props} />;
};

// PROVIDER_GOOGLE - only defined for Android dev builds
const PROVIDER_GOOGLE = Platform.OS === 'android' && !isExpoGo ? 'google' : undefined;

export { Marker, Polyline, PROVIDER_GOOGLE };
export default MapView;

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5dc',
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 8,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#263238',
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#263238',
    opacity: 0.6,
  },
});
