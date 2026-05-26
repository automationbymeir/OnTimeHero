import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, StatusBar, Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W, height: H } = Dimensions.get('window');
export const WALKTHROUGH_KEY = 'onboarding_completed_v1';

// Each step defines what to highlight and what to explain.
// spotlight: { top, height, left?, width? } — all values are 0-1 fractions of screen dimensions.
// tooltipSide: 'top' | 'bottom' | 'center' — where the tooltip card appears relative to spotlight.
const STEPS = [
  {
    id: 'welcome',
    icon: 'emoji-events',
    title: 'Welcome to OnTimeHero! 🏆',
    description:
      "Your personal punctuality coach. Earn XP for being on time, unlock badges, and level up. Let's take a 30-second tour!",
    spotlight: null,
    tooltipSide: 'center',
  },
  {
    id: 'punctuality',
    icon: 'speed',
    title: 'Your On-Time Rate 📊',
    description:
      'This big number is your punctuality score — how often you arrive on time. Keep it high to earn bonus XP and unlock achievement badges.',
    spotlight: { top: 0.20, height: 0.11 },
    tooltipSide: 'bottom',
  },
  {
    id: 'next_event',
    icon: 'directions-run',
    title: 'Your Next Mission ⏰',
    description:
      "This card tracks your upcoming event live. It shows your travel time, when to get ready, and turns red the moment it's time to leave!",
    spotlight: { top: 0.31, height: 0.31 },
    tooltipSide: 'bottom',
  },
  {
    id: 'quick_stats',
    icon: 'local-fire-department',
    title: 'Streak, XP & Level 🔥',
    description:
      'Your daily streak, total XP points, and current level — all at a glance. Every on-time arrival keeps your streak alive.',
    spotlight: { top: 0.63, height: 0.10 },
    tooltipSide: 'top',
  },
  {
    id: 'add_button',
    icon: 'add-circle',
    title: 'Add Events ✨',
    description:
      'Tap the glowing center button to create a new event. Tap "AI" to describe it in plain words, or "Manual" to fill in the form yourself.',
    spotlight: { top: 0.855, left: 0.35, width: 0.30, height: 0.085 },
    tooltipSide: 'top',
  },
  {
    id: 'ai_create',
    icon: 'auto-awesome',
    title: 'AI Event Creation 🎤',
    description:
      'Just say "Dentist Friday at 10am on Main Street" — the AI automatically extracts the title, date, time, and location. No typing needed!',
    spotlight: null,
    tooltipSide: 'center',
  },
  {
    id: 'badges',
    icon: 'military-tech',
    title: 'Earn Badges & Level Up 🏅',
    description:
      'Arrive on time → earn XP. Hit streaks and milestones → unlock 18 unique badges. Reach Level 10 to claim the Time Master crown!',
    spotlight: null,
    tooltipSide: 'center',
  },
  {
    id: 'done',
    icon: 'rocket-launch',
    title: "You're All Set! 🚀",
    description:
      'Start adding your events and become a time hero. Your journey to perfect punctuality begins now!',
    spotlight: null,
    tooltipSide: 'center',
  },
];

const TOOLTIP_HEIGHT = 230; // approximate — used for placement calculations

export default function WalkthroughOverlay({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Entrance animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
    ]).start();
    animateIcon();
  }, []);

  const animateIcon = () => {
    iconAnim.setValue(0);
    Animated.spring(iconAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();
  };

  const goToStep = (next) => {
    // Exit current step
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStepIndex(next);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.94);
      // Enter next step
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      ]).start();
      animateIcon();
    });
  };

  const handleNext = () => {
    if (isLast) handleComplete();
    else goToStep(stepIndex + 1);
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(WALKTHROUGH_KEY, 'true');
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(onComplete);
  };

  // ─── Spotlight ──────────────────────────────────────────────────────────────
  const renderSpotlight = () => {
    if (!step.spotlight) {
      // No spotlight: plain full dark overlay
      return <View style={[StyleSheet.absoluteFill, styles.darkOverlay]} />;
    }

    const { top: tFrac, height: hFrac, left: lFrac = 0, width: wFrac = 1 } = step.spotlight;
    const PADDING = 10;
    const top = tFrac * H - PADDING;
    const height = hFrac * H + PADDING * 2;
    const left = lFrac * W - PADDING;
    const width = wFrac * W + PADDING * 2;
    const bottom = top + height;
    const right = left + width;

    return (
      <>
        {/* Four dark rectangles forming the "hole" */}
        <View style={[styles.darkOverlay, { top: 0, height: top }]} />
        <View style={[styles.darkOverlay, { top: bottom, bottom: 0 }]} />
        <View style={[styles.darkOverlay, { top, height, left: 0, width: Math.max(0, left) }]} />
        <View style={[styles.darkOverlay, { top, height, left: right, right: 0 }]} />
        {/* Glowing border around the spotlight */}
        <Animated.View
          style={[styles.spotlightBorder, { top, left, width, height, opacity: fadeAnim }]}
        />
      </>
    );
  };

  // ─── Tooltip position ────────────────────────────────────────────────────────
  const getTooltipStyle = () => {
    if (!step.spotlight || step.tooltipSide === 'center') {
      return { top: H / 2 - TOOLTIP_HEIGHT / 2, left: 20, right: 20 };
    }

    const tFrac = step.spotlight.top;
    const hFrac = step.spotlight.height;
    const spotTop = tFrac * H;
    const spotBottom = (tFrac + hFrac) * H;

    if (step.tooltipSide === 'bottom') {
      const top = spotBottom + 14;
      return { top: Math.min(top, H - TOOLTIP_HEIGHT - 20), left: 20, right: 20 };
    }
    // 'top'
    const bottom = H - spotTop + 14;
    return { bottom: Math.min(bottom, H - TOOLTIP_HEIGHT - 20), left: 20, right: 20 };
  };

  const iconScale = iconAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 1.15, 1] });

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Spotlight layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {renderSpotlight()}
      </View>

      {/* Tooltip card */}
      <Animated.View
        style={[
          styles.tooltip,
          getTooltipStyle(),
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
        ]}
      >
        <LinearGradient colors={['rgba(20,20,40,0.97)', 'rgba(10,10,25,0.99)']} style={styles.tooltipInner}>
          {/* Icon */}
          <Animated.View style={[styles.iconWrapper, { transform: [{ scale: iconScale }] }]}>
            <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.iconGradient}>
              <Icon name={step.icon} size={28} color="#fff" />
            </LinearGradient>
          </Animated.View>

          {/* Step text */}
          <Text style={styles.stepLabel}>
            {stepIndex + 1} / {STEPS.length}
          </Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          {/* Progress dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === stepIndex && styles.dotActive]}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            {!isLast && (
              <TouchableOpacity onPress={handleComplete} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleNext} style={styles.nextBtnWrapper}>
              <LinearGradient
                colors={isLast ? ['#4CAF50', '#66bb6a'] : ['#4facfe', '#00f2fe']}
                style={styles.nextBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.nextText}>{isLast ? "Let's Go! 🚀" : 'Next'}</Text>
                {!isLast && <Icon name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Tap-outside to advance (only when no spotlight, so we don't block the highlighted element) */}
      {!step.spotlight && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleNext}
          activeOpacity={1}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  darkOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: 'rgba(79,172,254,0.9)',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltip: {
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(79,172,254,0.3)',
  },
  tooltipInner: {
    padding: 22,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 10,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 11,
    color: 'rgba(79,172,254,0.9)',
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: '#4facfe',
    width: 18,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 10,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  nextBtnWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextBtn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
