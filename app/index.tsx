import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ExplorerHUD } from '@/components/ExplorerHUD';
import { PulsingMarker } from '@/components/PulsingMarker';
import { ScanAreaButton } from '@/components/ScanAreaButton';
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

  const isWeb = Platform.OS === 'web';

  // Update mission progress when steps change
  useEffect(() => {
    if (activeMission && missionState === 'active') {
      updateMissionProgress(steps);
    }
  }, [steps, activeMission, missionState, updateMissionProgress]);

  // Record GPS route when location updates during active mission
  useEffect(() => {
    if (location && missionState === 'active') {
      addRoutePoint(location.latitude, location.longitude);
    }
  }, [location, missionState, addRoutePoint]);

  // Center map on user when location updates (only on native)
  useEffect(() => {
    if (!isWeb && location && mapRef.current && isMapReady) {
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
  }, [location, isMapReady, isWeb]);

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
    selectMission(mission, steps);
  }, [selectMission, steps]);

  const handleCompleteMission = useCallback(() => {
    completeMission();
  }, [completeMission]);

  const handleDismissCompletion = useCallback(() => {
    cancelMission(); // Reset to idle state
  }, [cancelMission]);

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

          {/* Route path during active mission */}
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
            />
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
      />

      {/* Recenter Button - Native only, hidden during mission selection */}
      {!isWeb && !isSelecting && (
        <TouchableOpacity
          style={[
            styles.recenterButton,
            { bottom: insets.bottom + (isActive ? 180 : 120) },
          ]}
          onPress={handleCenterOnUser}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={24} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Journal Button - Hidden during mission selection */}
      {!isSelecting && !isCompleted && (
        <TouchableOpacity
          style={[
            styles.journalButton,
            { bottom: insets.bottom + (isActive ? 180 : 120) },
          ]}
          onPress={() => router.push('/journal')}
          activeOpacity={0.8}
        >
          <Ionicons name="journal" size={24} color={Colors.primary} />
        </TouchableOpacity>
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

      {/* Scan Area Button - Shown in idle state */}
      {showScanButton && (
        <View style={[styles.scanButtonContainer, { bottom: insets.bottom + Spacing.md }]}>
          <ScanAreaButton
            onPress={handleScanArea}
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

      {/* Mission Complete Panel - Celebration screen */}
      {activeMission && isCompleted && (
        <MissionCompletePanel
          mission={activeMission}
          onDismiss={handleDismissCompletion}
          isVisible={isCompleted}
        />
      )}
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
  recenterButton: {
    position: 'absolute',
    right: Spacing.md,
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  journalButton: {
    position: 'absolute',
    left: Spacing.md,
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
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
