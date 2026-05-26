import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AwardPopup = ({ visible, award, onClose }) => {
  const slideAnim = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && award) {
      // Reset animations
      slideAnim.setValue(-SCREEN_HEIGHT);
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
      sparkleAnims.forEach(anim => anim.setValue(0));
      glowAnim.setValue(0);

      // Start animations sequence
      Animated.sequence([
        // Slide in from top
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        // Then scale icon
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          // Rotate icon
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          // Glow effect
          Animated.loop(
            Animated.sequence([
              Animated.timing(glowAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(glowAnim, {
                toValue: 0,
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ),
        ]),
      ]).start();

      // Sparkle animations
      sparkleAnims.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 100),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 1000,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });

      // Continuous pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto-close after 4 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible, award]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_HEIGHT,
        duration: 400,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible || !award) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Icon name="close" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          {/* Sparkles */}
          {sparkleAnims.map((anim, index) => {
            const angle = (index * 360) / 8;
            const distance = 80;
            const translateX = Math.cos((angle * Math.PI) / 180) * distance;
            const translateY = Math.sin((angle * Math.PI) / 180) * distance;

            return (
              <Animated.View
                key={index}
                style={[
                  styles.sparkle,
                  {
                    opacity: anim,
                    transform: [
                      {
                        translateX: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, translateX],
                        }),
                      },
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, translateY],
                        }),
                      },
                      { scale: anim },
                    ],
                  },
                ]}
              >
                <Text style={styles.sparkleText}>✨</Text>
              </Animated.View>
            );
          })}

          {/* Glow Effect */}
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
              },
            ]}
          />

          {/* Award Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: Animated.multiply(scaleAnim, pulseAnim) },
                  { rotate },
                ],
              },
            ]}
          >
            <Text style={styles.icon}>{award.icon}</Text>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>🎉 {award.title}!</Text>

          {/* Description */}
          <Text style={styles.description}>{award.description}</Text>

          {/* XP Reward */}
          <View style={styles.rewardContainer}>
            <Icon name="star" size={20} color="#FFD700" />
            <Text style={styles.rewardText}>+{award.xpReward} XP</Text>
          </View>

          {/* Badge Indicator */}
          {award.badgeReward && (
            <View style={styles.badgeContainer}>
              <Icon name="workspace-premium" size={16} color="#FFD700" />
              <Text style={styles.badgeText}>Badge Unlocked!</Text>
            </View>
          )}

          {/* Tap to close hint */}
          <Text style={styles.hintText}>Tap anywhere to continue</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'visible',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    zIndex: 10,
  },
  sparkle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -10,
    marginLeft: -10,
  },
  sparkleText: {
    fontSize: 20,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#fff',
    top: '50%',
    left: '50%',
    marginTop: -100,
    marginLeft: -100,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  icon: {
    fontSize: 60,
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    ...Typography.body,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    opacity: 0.9,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  rewardText: {
    ...Typography.h4,
    color: '#FFD700',
    marginLeft: Spacing.sm,
    fontWeight: Typography.weight.bold,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  badgeText: {
    ...Typography.caption,
    color: '#FFD700',
    marginLeft: Spacing.xs,
    fontWeight: Typography.weight.semibold,
  },
  hintText: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
});

export default AwardPopup;
