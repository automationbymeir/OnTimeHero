import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, CommonStyles, getTextShadow, getStrongTextShadow, getDynamicBackground } from '../../styles/theme';
import AwardPopup from '../../components/AwardPopup';
import GamificationService from '../../services/GamificationService';

const AwardTestScreen = ({ navigation }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [currentAward, setCurrentAward] = useState(null);

  const showAward = (award) => {
    setCurrentAward(award);
    setShowPopup(true);
  };

  const testAwards = [
    {
      id: 'first_steps',
      title: 'First Steps',
      description: 'Complete first event on time',
      icon: '👣',
      xpReward: 50,
      badgeReward: 'first_steps',
    },
    {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Arrive early to an event',
      icon: '🐦',
      xpReward: 100,
      badgeReward: 'early_bird',
    },
    {
      id: 'punctual_pro',
      title: 'Punctuality Pro',
      description: 'Complete 5 events on time',
      icon: '⏰',
      xpReward: 200,
      badgeReward: 'punctual_pro',
    },
    {
      id: 'perfect_week',
      title: 'Perfect Week',
      description: 'Maintain 7-day on-time streak',
      icon: '🔥',
      xpReward: 300,
      badgeReward: 'perfect_week',
    },
    {
      id: 'focused_mind',
      title: 'Focused Mind',
      description: 'Use focus mode for first time',
      icon: '🧘',
      xpReward: 50,
      badgeReward: 'focused_mind',
    },
    {
      id: 'time_master',
      title: 'Time Master',
      description: 'Reach Level 10',
      icon: '👑',
      xpReward: 500,
      badgeReward: 'time_master',
    },
    {
      id: 'voice_commander',
      title: 'Voice Commander',
      description: 'Create 5 events using voice assistant',
      icon: '🎤',
      xpReward: 150,
      badgeReward: 'voice_commander',
    },
  ];

  const testXPAwards = [
    {
      title: 'Event On Time',
      description: '+50 XP',
      icon: '✅',
      xpReward: 50,
      action: () => {
        GamificationService.awardPoints(50, 'Event completed on time (TEST)');
        Alert.alert('XP Awarded', '+50 XP for completing event on time!');
      },
    },
    {
      title: 'Event Early',
      description: '+100 XP',
      icon: '⚡',
      xpReward: 100,
      action: () => {
        GamificationService.awardPoints(100, 'Event completed early (TEST)');
        Alert.alert('XP Awarded', '+100 XP for completing event early!');
      },
    },
    {
      title: 'Event Created',
      description: '+10 XP',
      icon: '📝',
      xpReward: 10,
      action: () => {
        GamificationService.awardEventCreationPoints('test_event', 'Test Event');
        Alert.alert('XP Awarded', '+10 XP for creating an event!');
      },
    },
    {
      title: 'Focus Mode',
      description: '+20 XP',
      icon: '🧘',
      xpReward: 20,
      action: () => {
        GamificationService.awardFocusModePoints();
        Alert.alert('XP Awarded', '+20 XP for using focus mode!');
      },
    },
  ];

  const testLevelCalculation = () => {
    const testCases = [
      { xp: 0, expectedLevel: 1 },
      { xp: 100, expectedLevel: 1 },
      { xp: 150, expectedLevel: 1 },
      { xp: 300, expectedLevel: 2 },
      { xp: 600, expectedLevel: 3 },
      { xp: 1000, expectedLevel: 4 },
      { xp: 5050, expectedLevel: 10 },
    ];

    let results = 'Level Calculation Test Results:\n\n';
    testCases.forEach(({ xp, expectedLevel }) => {
      const calculatedLevel = GamificationService.calculateLevel(xp);
      const xpForNext = GamificationService.calculateXPForNextLevel(xp);
      const match = calculatedLevel === expectedLevel ? '✅' : '❌';
      results += `${match} XP: ${xp} → Level ${calculatedLevel} (Expected: ${expectedLevel})\n`;
      results += `   Next level in: ${xpForNext} XP\n\n`;
    });

    Alert.alert('Level Calculation Test', results);
  };

  const backgroundColors = getDynamicBackground();

  return (
    <LinearGradient colors={backgroundColors} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, getStrongTextShadow()]}>Award Tests</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Achievement Popups */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getTextShadow()]}>Achievement Popups</Text>
          <Text style={styles.sectionDescription}>
            Test each achievement popup animation
          </Text>

          {testAwards.map((award, index) => (
            <TouchableOpacity
              key={index}
              style={[CommonStyles.glassCard, styles.testButton]}
              onPress={() => showAward(award)}
            >
              <Text style={styles.awardIcon}>{award.icon}</Text>
              <View style={styles.awardInfo}>
                <Text style={styles.awardTitle}>{award.title}</Text>
                <Text style={styles.awardDescription}>{award.description}</Text>
              </View>
              <View style={styles.xpBadge}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.xpText}>+{award.xpReward}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Test XP Awards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getTextShadow()]}>XP Awards</Text>
          <Text style={styles.sectionDescription}>
            Test XP awards for different actions (per playbook)
          </Text>

          {testXPAwards.map((award, index) => (
            <TouchableOpacity
              key={index}
              style={[CommonStyles.glassCard, styles.testButton]}
              onPress={award.action}
            >
              <Text style={styles.awardIcon}>{award.icon}</Text>
              <View style={styles.awardInfo}>
                <Text style={styles.awardTitle}>{award.title}</Text>
                <Text style={styles.awardDescription}>{award.description}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Test Level Calculation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getTextShadow()]}>Level System</Text>
          <Text style={styles.sectionDescription}>
            Verify level progression formula
          </Text>

          <TouchableOpacity
            style={[CommonStyles.glassCard, styles.testButton]}
            onPress={testLevelCalculation}
          >
            <Icon name="trending-up" size={32} color="#FFD700" />
            <View style={styles.awardInfo}>
              <Text style={styles.awardTitle}>Test Level Calculation</Text>
              <Text style={styles.awardDescription}>
                Verify: L1=100XP, L2=300XP, L3=600XP, etc.
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={[CommonStyles.glassCard, styles.infoCard]}>
          <Text style={[styles.sectionTitle, getTextShadow()]}>Award System Info</Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>XP Per Action:</Text>
          </Text>
          <Text style={styles.infoItem}>• Event on time: 50 XP</Text>
          <Text style={styles.infoItem}>• Event early: 100 XP</Text>
          <Text style={styles.infoItem}>• Event created: 10 XP</Text>
          <Text style={styles.infoItem}>• Focus mode: 20 XP</Text>

          <Text style={[styles.infoText, { marginTop: Spacing.md }]}>
            <Text style={styles.infoBold}>Level Progression:</Text>
          </Text>
          <Text style={styles.infoItem}>• Level 1: 100 XP</Text>
          <Text style={styles.infoItem}>• Level 2: 300 XP (cumulative)</Text>
          <Text style={styles.infoItem}>• Level 3: 600 XP (cumulative)</Text>
          <Text style={styles.infoItem}>• Level N: N × 100 XP increment</Text>

          <Text style={[styles.infoText, { marginTop: Spacing.md }]}>
            <Text style={styles.infoBold}>Achievements:</Text>
          </Text>
          <Text style={styles.infoItem}>• {testAwards.length} total achievements</Text>
          <Text style={styles.infoItem}>• Unlock conditions vary</Text>
          <Text style={styles.infoItem}>• Bonus XP rewards</Text>
        </View>
      </ScrollView>

      {/* Award Popup */}
      <AwardPopup
        visible={showPopup}
        award={currentAward}
        onClose={() => setShowPopup(false)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: CommonStyles.container,
  header: {
    ...CommonStyles.row,
    padding: Spacing.lg,
    paddingTop: Spacing.huge,
    backgroundColor: Colors.glass.black10,
  },
  backButton: {
    marginRight: Spacing.base,
  },
  headerTitle: {
    ...Typography.h3,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  awardIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  awardInfo: {
    flex: 1,
  },
  awardTitle: {
    ...Typography.body,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  awardDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  xpText: {
    ...Typography.caption,
    color: '#FFD700',
    fontWeight: Typography.weight.bold,
    marginLeft: Spacing.xs,
  },
  infoCard: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  infoText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  infoBold: {
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  infoItem: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginLeft: Spacing.md,
    marginBottom: 4,
  },
});

export default AwardTestScreen;
