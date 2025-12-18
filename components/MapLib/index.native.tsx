/**
 * MapLib - Native Map Implementation
 * This file is loaded on iOS/Android
 * Always shows fallback - react-native-maps requires a development build
 *
 * Since we're using Expo Go, maps won't work without a custom dev build.
 * This component gracefully falls back to a placeholder.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

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

// MapView component - shows fallback in Expo Go
const MapView = React.forwardRef<View, Record<string, unknown>>((props, _ref) => {
  const { style, onMapReady } = props;
  const viewStyle = style as ViewStyle | undefined;

  // Call onMapReady immediately for fallback
  useEffect(() => {
    if (onMapReady && typeof onMapReady === 'function') {
      setTimeout(() => (onMapReady as () => void)(), 100);
    }
  }, [onMapReady]);

  return <MapFallback style={viewStyle} />;
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

// Marker - renders children as placeholder
const Marker: React.FC<MarkerProps> = ({ children }) => <PlaceholderMarker>{children}</PlaceholderMarker>;

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

// Polyline - renders nothing as placeholder
const Polyline: React.FC<PolylineProps> = () => <PlaceholderPolyline />;

// PROVIDER_GOOGLE - undefined since maps not available
const PROVIDER_GOOGLE = undefined;

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
});
