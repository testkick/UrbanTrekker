import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ExplorerHUD } from '@/components/ExplorerHUD';
import { PulsingMarker } from '@/components/PulsingMarker';
import { DestinationMarker } from '@/components/DestinationMarker';
import { DiscoveryCard } from '@/components/DiscoveryCard';
import { DiagnosticPanel } from '@/components/DiagnosticPanel';
import { ScanAreaButton } from '@/components/ScanAreaButton';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { QuestCardContainer } from '@/components/QuestCard';
import { ActiveMissionPanel, MissionCompletePanel } from '@/components/ActiveMissionPanel';
import { useLocation } from '@/hooks/useLocation';
import { usePedometer } from '@/hooks/usePedometer';
import { useBattery } from '@/hooks/useBattery';
import { useMission } from '@/hooks/useMission';
import { useStepSync } from '@/hooks/useStepSync';
import { Mission } from '@/types/mission';
import { Colors, Spacing, BorderRadius, Shadows, FontSizes } from '@/constants/theme';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '@/components/MapLib';

const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = 0.01;

// Custom map style for Urban Explorer theme
const mapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f5dc' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#263238' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f5f5dc' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#ddd' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#FF6F00' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#c8e6c9' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#2E7D32' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#b3e5fc' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0288d1' }],
  },
];

// Web fallback component
const WebMapFallback: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.webFallbackContainer}>
      <View style={styles.webFallbackPattern}>
        {[...Array(8)].map((_, i) => (
          <View
            key={`h-${i}`}
            style={[
              styles.gridLineHorizontal,
              { top: `${(i + 1) * 12}%` },
            ]}
          />
        ))}
        {[...Array(6)].map((_, i) => (
          <View
            key={`v-${i}`}
            style={[
              styles.gridLineVertical,
              { left: `${(i + 1) * 16}%` },
            ]}
          />
        ))}
      </View>

      <View style={[styles.webFallbackContent, { paddingTop: insets.top + 120 }]}>
        <View style={styles.markerPreviewContainer}>
          <PulsingMarker size={32} />
        </View>

        <View style={styles.webIconContainer}>
          <Ionicons name="map" size={64} color={Colors.primary} />
        </View>

        <Text style={styles.webFallbackTitle}>Explorer Map</Text>
        <Text style={styles.webFallbackSubtitle}>
          Interactive map view is available on mobile devices
        </Text>

        <View style={styles.deviceIndicator}>
          <Ionicons name="phone-portrait-outline" size={20} color={Colors.accent} />
          <Text style={styles.deviceIndicatorText}>
            Open on iOS or Android for the full experience
          </Text>
        </View>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="location" size={18} color={Colors.primary} />
            <Text style={styles.featureText}>Real-time GPS tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="footsteps" size={18} color={Colors.primary} />
            <Text style={styles.featureText}>Step counting & distance</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="compass" size={18} color={Colors.primary} />
            <Text style={styles.featureText}>AI-generated walking quests</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function ExplorerDashboard() {
  const mapRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const [isMapReady, setIsMapReady] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const { location, isLoading, errorMsg: locationError } = useLocation();
  const { steps, isAvailable: isPedometerAvailable, errorMsg: pedometerError } = usePedometer();
  const { batteryLevel, isAvailable: isBatteryAvailable, errorMsg: batteryError } = useBattery();

  // Continuously sync steps to lifetime stats
  useStepSync({
    currentSteps: steps,
    isAvailable: isPedometerAvailable,
  });

  const {
    state: missionState,
    missions,
    activeMission,
    error: missionError,
    scanForMissions,
    selectMission,
    updateMissionProgress,
    addRoutePoint,
    completeMission,
    cancelMission,
    dismissMissions,
  } = useMission();

  // Diagnostic: Log environment variable status on mount
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log('🔧 App Startup - Environment Diagnostic:');
    console.log(`  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND'}`);
    console.log(`  Key length: ${apiKey?.length || 0}`);
    if (!apiKey) {
      console.error('❌ CRITICAL: API key missing! You MUST restart the dev server for .env changes to take effect.');
    }
  }, []);

  const isWeb = Platform.OS === 'web';

  // Update mission progress when steps change or location updates
  // FIXED: Use location.latitude/longitude instead of location object to prevent
  // infinite loops from object reference changes
  useEffect(() => {
    if (activeMission && missionState === 'active' && location) {
      updateMissionProgress(steps, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, location?.latitude, location?.longitude, missionState, activeMission, updateMissionProgress]);

  // Record GPS route when location updates during active mission
  // FIXED: Use location.latitude/longitude to prevent infinite loops
  useEffect(() => {
    if (location && missionState === 'active') {
      addRoutePoint(location.latitude, location.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, missionState, addRoutePoint]);

  // Center map on user ONCE when location first becomes available
  const hasInitiallyCenter = useRef(false);
  const lastCameraUpdateRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const cameraUpdateThreshold = 10; // meters - only update camera when user moves this far

  useEffect(() => {
    if (!isWeb && location && mapRef.current && isMapReady && !hasInitiallyCenter.current) {
      console.log('📍 Centering map on initial user location');
      hasInitiallyCenter.current = true;
      lastCameraUpdateRef.current = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        },
        1000
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, isMapReady, isWeb]);

  // Smooth camera following during active mission
  // Only updates camera when user moves significantly to prevent constant re-centering
  useEffect(() => {
    if (
      !isWeb &&
      missionState === 'active' &&
      location &&
      mapRef.current &&
      isMapReady &&
      hasInitiallyCenter.current &&
      location.isSignificantMovement
    ) {
      const lastUpdate = lastCameraUpdateRef.current;

      if (lastUpdate) {
        // Calculate distance from last camera update
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lastUpdate.latitude * Math.PI) / 180;
        const φ2 = (location.latitude * Math.PI) / 180;
        const Δφ = ((location.latitude - lastUpdate.latitude) * Math.PI) / 180;
        const Δλ = ((location.longitude - lastUpdate.longitude) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Only update camera if user has moved beyond threshold
        if (distance > cameraUpdateThreshold) {
          console.log(`🎥 Smooth camera follow (moved ${distance.toFixed(1)}m)`);
          lastCameraUpdateRef.current = {
            latitude: location.latitude,
            longitude: location.longitude,
          };

          // Smooth animated transition
          mapRef.current.animateToRegion(
            {
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            },
            800 // Smooth 800ms animation
          );
        }
      } else {
        // First update during mission
        lastCameraUpdateRef.current = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    location?.latitude,
    location?.longitude,
    location?.isSignificantMovement,
    missionState,
    isMapReady,
    isWeb,
  ]);

  const handleCenterOnUser = useCallback(() => {
    if (!isWeb && location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        },
        500
      );
    }
  }, [isWeb, location]);

  const handleScanArea = useCallback(() => {
    // Pass current location for context-aware mission generation
    const locationContext = location ? {
      latitude: location.latitude,
      longitude: location.longitude,
    } : undefined;

    scanForMissions(locationContext);
  }, [scanForMissions, location]);

  const handleSelectMission = useCallback((mission: Mission) => {
    // Pass current location for goal coordinate calculation
    if (location) {
      selectMission(mission, steps, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  }, [selectMission, steps, location]);

  const handleCompleteMission = useCallback(() => {
    completeMission();
  }, [completeMission]);

  const handleDismissCompletion = useCallback(() => {
    cancelMission(); // Reset to idle state
  }, [cancelMission]);

  // Debug: Log streetPath changes with detailed coordinates (only on streetPath change)
  // FIXED: Only depend on extracted values to prevent excessive logging
  const streetPathLength = activeMission?.streetPath?.length;
  const missionTitle = activeMission?.title;
  const hasStreetPath = !!activeMission?.streetPath;
  useEffect(() => {
    if (activeMission) {
      console.log('🎯 Active Mission Street Path Status:');
      console.log(`  Mission: ${missionTitle}`);
      console.log(`  Has streetPath: ${hasStreetPath ? 'Yes' : 'No'}`);
      if (activeMission.streetPath && activeMission.streetPath.length > 0) {
        console.log(`  Street path length: ${activeMission.streetPath.length} points`);
        console.log(`  First point: (${activeMission.streetPath[0].latitude.toFixed(6)}, ${activeMission.streetPath[0].longitude.toFixed(6)})`);
        console.log(`  Last point: (${activeMission.streetPath[activeMission.streetPath.length - 1].latitude.toFixed(6)}, ${activeMission.streetPath[activeMission.streetPath.length - 1].longitude.toFixed(6)})`);
        console.log(`  ✅ Will render street-following blue path`);
      } else {
        console.log(`  ⚠️ No street path - will render straight line`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streetPathLength, missionTitle, hasStreetPath]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Initializing Explorer...</Text>
        <Text style={styles.loadingSubtext}>Acquiring location and sensors</Text>
      </View>
    );
  }

  const isScanning = missionState === 'scanning';
  const isSelecting = missionState === 'selecting';
  const isActive = missionState === 'active';
  const isCompleted = missionState === 'completed';
  const showScanButton = missionState === 'idle' || missionState === 'scanning';

  return (
    <View style={styles.container}>
      <StatusBar style={isWeb ? 'dark' : 'light'} />

      {/* Map View - Native only */}
      {!isWeb ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={mapStyle}
          initialRegion={
            location
              ? {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: LATITUDE_DELTA,
                  longitudeDelta: LONGITUDE_DELTA,
                }
              : undefined
          }
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          onMapReady={() => setIsMapReady(true)}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
            >
              <PulsingMarker size={20} />
            </Marker>
          )}

          {/* Quest path - Blue dashed line following streets to goal */}
          {activeMission && activeMission.goalCoordinate && location && (
            <Polyline
              coordinates={
                activeMission.streetPath && activeMission.streetPath.length > 0
                  ? activeMission.streetPath.map(coord => ({
                      latitude: coord.latitude,
                      longitude: coord.longitude,
                    }))
                  : [
                      {
                        latitude: location.latitude,
                        longitude: location.longitude,
                      },
                      {
                        latitude: activeMission.goalCoordinate.latitude,
                        longitude: activeMission.goalCoordinate.longitude,
                      },
                    ]
              }
              strokeColor="#00B0FF"
              strokeWidth={3}
              lineDashPattern={[10, 10]}
              lineCap="round"
              zIndex={1}
            />
          )}

          {/* Route path during active mission - Orange walked path */}
          {activeMission && activeMission.routeCoordinates && activeMission.routeCoordinates.length > 1 && (
            <Polyline
              coordinates={activeMission.routeCoordinates.map(coord => ({
                latitude: coord.latitude,
                longitude: coord.longitude,
              }))}
              strokeColor="#FF6F00"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          )}

          {/* Goal marker - Dynamic destination marker with type-specific icon */}
          {activeMission && activeMission.goalCoordinate && (
            <Marker
              coordinate={{
                latitude: activeMission.goalCoordinate.latitude,
                longitude: activeMission.goalCoordinate.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
            >
              <DestinationMarker
                destinationType={activeMission.destinationType}
                size={32}
              />
            </Marker>
          )}
        </MapView>
      ) : (
        <WebMapFallback />
      )}

      {/* HUD Overlay - Works on all platforms */}
      <ExplorerHUD
        steps={steps}
        isAvailable={isPedometerAvailable}
        batteryLevel={batteryLevel}
        isBatteryAvailable={isBatteryAvailable}
        distanceToGoal={activeMission?.distanceToGoal}
        destinationNarrative={activeMission?.destinationNarrative}
      />

      {/* Premium Floating Action Buttons - Hidden during mission selection and completion */}
      {!isSelecting && !isCompleted && (
        <>
          {/* Journal Button - Left side with label for clarity */}
          <FloatingActionButton
            icon="book"
            label="Journal"
            onPress={() => router.push('/journal')}
            position="left"
            bottom={insets.bottom + (isActive ? 190 : 130)}
            color={Colors.primary}
            size="medium"
          />

          {/* Re-center button - Right side (native only) */}
          {!isWeb && (
            <FloatingActionButton
              icon="locate"
              onPress={handleCenterOnUser}
              position="right"
              bottom={insets.bottom + (isActive ? 190 : 130)}
              color={Colors.accent}
              size="medium"
            />
          )}
        </>
      )}

      {/* Permission/Error Banner */}
      {(locationError || pedometerError || batteryError || missionError) && !isWeb && !isSelecting && (
        <View style={[styles.errorBanner, { bottom: insets.bottom + (isActive ? 240 : 180) }]}>
          <Ionicons name="warning" size={16} color={Colors.accent} />
          <Text style={styles.errorText}>
            {missionError || locationError || pedometerError || batteryError}
          </Text>
        </View>
      )}

      {/* Scan Area Button - Positioned above floating buttons to avoid overlap */}
      {showScanButton && (
        <View style={[styles.scanButtonContainer, { bottom: insets.bottom + 50 }]}>
          <ScanAreaButton
            onPress={handleScanArea}
            onLongPress={() => setShowDiagnostics(true)}
            isScanning={isScanning}
          />
        </View>
      )}

      {/* Quest Card Selection - Shown when missions are generated */}
      <QuestCardContainer
        missions={missions}
        onSelect={handleSelectMission}
        isVisible={isSelecting}
        onDismiss={dismissMissions}
      />

      {/* Active Mission Panel - Shown during active quest */}
      {activeMission && (
        <ActiveMissionPanel
          mission={activeMission}
          onCancel={cancelMission}
          onComplete={handleCompleteMission}
          isVisible={isActive}
        />
      )}

      {/* Discovery Card - Slides up when user arrives at destination */}
      {activeMission && activeMission.hasArrived && !isCompleted && (
        <DiscoveryCard
          isVisible={true}
          destinationArchetype={activeMission.destinationArchetype || 'Local Destination'}
          destinationNarrative={activeMission.destinationNarrative}
          poiName={activeMission.poiName}
          poiAddress={activeMission.poiAddress}
          discoveryStory={activeMission.discoveryStory}
          onCollectReward={handleCompleteMission}
        />
      )}

      {/* Mission Complete Panel - Celebration screen */}
      {activeMission && isCompleted && (
        <MissionCompletePanel
          mission={activeMission}
          onDismiss={handleDismissCompletion}
          isVisible={isCompleted}
        />
      )}

      {/* Diagnostic Panel - Hidden diagnostic tool (long-press Scan Area) */}
      <DiagnosticPanel
        isVisible={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        currentLocation={location ? { latitude: location.latitude, longitude: location.longitude } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingSubtext: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.6,
  },
  map: {
    flex: 1,
  },
  // Floating action buttons now use FloatingActionButton component
  errorBanner: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 111, 0, 0.9)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  scanButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  // Web fallback styles
  webFallbackContainer: {
    flex: 1,
    backgroundColor: Colors.secondary,
    position: 'relative',
    overflow: 'hidden',
  },
  webFallbackPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.primary,
    opacity: 0.2,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.primary,
    opacity: 0.2,
  },
  webFallbackContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  markerPreviewContainer: {
    marginBottom: Spacing.xl,
  },
  webIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.large,
  },
  webFallbackTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  webFallbackSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  deviceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 111, 0, 0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  deviceIndicatorText: {
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '500',
  },
  featureList: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    opacity: 0.8,
  },
});
