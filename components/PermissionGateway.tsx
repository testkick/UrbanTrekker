/**
 * Permission Gateway - Branded onboarding for location and motion permissions
 * Professional pre-permission explanation screen with Urban Explorer aesthetic
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

interface PermissionGatewayProps {
  onPermissionsGranted: () => void;
}

interface PermissionCard {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const PERMISSION_CARDS: PermissionCard[] = [
  {
    icon: 'navigate-circle',
    title: 'Location Access',
    description: 'To discover hidden local gems and guide you through secret neighborhood routes.',
    color: '#10B981', // Forest Green
  },
  {
    icon: 'footsteps',
    title: 'Motion & Fitness',
    description: 'To accurately track every step of your journey and credit your achievements.',
    color: '#3B82F6', // Blue
  },
  {
    icon: 'phone-portrait',
    title: 'Background Tracking',
    description: 'To ensure your adventure continues even when your phone is in your pocket.',
    color: '#8B5CF6', // Purple
  },
];

export const PermissionGateway: React.FC<PermissionGatewayProps> = ({
  onPermissionsGranted,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardAnims = useRef(
    PERMISSION_CARDS.map(() => ({
      scale: new Animated.Value(0.8),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger card animations
    const cardAnimations = cardAnims.map((anim, index) =>
      Animated.parallel([
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: 200 + index * 150,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 600,
          delay: 200 + index * 150,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(150, cardAnimations).start();
  }, [fadeAnim, slideAnim, cardAnims]);

  const handleContinue = async () => {
    setIsRequesting(true);

    try {
      // Request location permission (foreground)
      const foregroundResult = await Location.requestForegroundPermissionsAsync();

      if (foregroundResult.status !== 'granted') {
        console.warn('Foreground location permission denied');
        setIsRequesting(false);
        return;
      }

      // Request background location permission
      if (Platform.OS === 'ios') {
        const backgroundResult = await Location.requestBackgroundPermissionsAsync();
        if (backgroundResult.status !== 'granted') {
          console.warn('Background location permission denied');
        }
      }

      // Permissions granted - proceed to app
      onPermissionsGranted();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setIsRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.backgroundGradient}
      />

      {/* Animated content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero section */}
          <View style={styles.hero}>
            {/* App icon placeholder */}
            <View style={styles.appIcon}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.appIconGradient}
              >
                <Ionicons name="footsteps" size={48} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={styles.heroTitle}>Welcome to Stepquest</Text>
            <Text style={styles.heroSubtitle}>
              Your Urban Adventure Awaits
            </Text>
          </View>

          {/* Permission cards */}
          <View style={styles.cardsContainer}>
            <Text style={styles.sectionTitle}>To Begin Your Journey</Text>
            <Text style={styles.sectionSubtitle}>
              We need a few permissions to unlock your adventure
            </Text>

            {PERMISSION_CARDS.map((card, index) => (
              <Animated.View
                key={card.title}
                style={[
                  styles.cardWrapper,
                  {
                    opacity: cardAnims[index].opacity,
                    transform: [{ scale: cardAnims[index].scale }],
                  },
                ]}
              >
                <View style={[styles.card, { borderLeftColor: card.color }]}>
                  {/* Icon circle */}
                  <View style={[styles.iconCircle, { backgroundColor: `${card.color}20` }]}>
                    <Ionicons name={card.icon} size={28} color={card.color} />
                  </View>

                  {/* Text content */}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardDescription}>{card.description}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Privacy note */}
          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.privacyText}>
              Your privacy is protected. Location data is only used for navigation and never shared.
            </Text>
          </View>
        </ScrollView>

        {/* Continue button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, isRequesting && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isRequesting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              {isRequesting ? (
                <Text style={styles.continueButtonText}>Requesting...</Text>
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continue to Adventure</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  appIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  cardsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 24,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderLeftWidth: 4,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
  },
  continueButton: {
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
