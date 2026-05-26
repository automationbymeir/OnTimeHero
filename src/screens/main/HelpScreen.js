import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Theme, { Colors, Typography, Spacing, BorderRadius, CommonStyles, getTextShadow, getStrongTextShadow, getDynamicBackground, createGlassCard } from '../../styles/theme';

const HelpScreen = ({ navigation }) => {
  const pointsRules = [
    { action: 'Arrive on time', points: '+10', description: 'For every event you arrive on time' },
    { action: 'Arrive early', points: '+15', description: 'For arriving 5+ minutes early' },
    { action: 'Complete event streak', points: '+25', description: 'For completing 5 events in a row on time' },
    { action: 'Weekly goal achieved', points: '+50', description: 'For meeting your weekly punctuality goal' },
    { action: 'Late arrival', points: '-5', description: 'For arriving late to an event' },
    { action: 'Missed event', points: '-20', description: 'For completely missing an event' },
  ];

  const badges = [
    { 
      name: 'Early Bird', 
      icon: '🐦', 
      description: 'Arrive early to 10 events',
      requirement: '10 early arrivals',
      points: 150
    },
    { 
      name: 'Punctuality Pro', 
      icon: '⏰', 
      description: 'Maintain 95% punctuality for a week',
      requirement: '95% punctuality for 7 days',
      points: 200
    },
    { 
      name: 'Streak Master', 
      icon: '🔥', 
      description: 'Complete 20 events in a row on time',
      requirement: '20 consecutive on-time events',
      points: 500
    },
    { 
      name: 'Time Guardian', 
      icon: '🛡️', 
      description: 'Use phone lock feature for 50 events',
      requirement: '50 events with phone lock enabled',
      points: 300
    },
    { 
      name: 'Calendar Champion', 
      icon: '📅', 
      description: 'Sync and manage 100 calendar events',
      requirement: '100 synced calendar events',
      points: 400
    },
    { 
      name: 'Perfectionist', 
      icon: '💎', 
      description: 'Achieve 100% punctuality for a month',
      requirement: '100% punctuality for 30 days',
      points: 1000
    },
  ];

  const backgroundColors = getDynamicBackground();

  return (
    <LinearGradient colors={backgroundColors} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, getStrongTextShadow()]}>Help & Guide</Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Points System */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getStrongTextShadow()]}>⭐ Points System</Text>
          <Text style={styles.sectionDescription}>
            Earn points by being punctual and using app features. Points help track your progress and unlock achievements.
          </Text>
          
          <View style={styles.pointsContainer}>
            {pointsRules.map((rule, index) => (
              <View key={index} style={styles.pointsItem}>
                <View style={styles.pointsHeader}>
                  <Text style={styles.pointsAction}>{rule.action}</Text>
                  <Text style={[
                    styles.pointsValue,
                    rule.points.startsWith('+') ? styles.positivePoints : styles.negativePoints
                  ]}>
                    {rule.points}
                  </Text>
                </View>
                <Text style={styles.pointsDescription}>{rule.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Badges System */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getStrongTextShadow()]}>🏆 Badges & Achievements</Text>
          <Text style={styles.sectionDescription}>
            Unlock badges by achieving specific goals and milestones. Each badge comes with bonus points!
          </Text>
          
          <View style={styles.badgesContainer}>
            {badges.map((badge, index) => (
              <View key={index} style={styles.badgeItem}>
                <View style={styles.badgeHeader}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <View style={styles.badgeInfo}>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgePoints}>+{badge.points} points</Text>
                  </View>
                </View>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
                <Text style={styles.badgeRequirement}>Requirement: {badge.requirement}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getStrongTextShadow()]}>💡 Tips for Success</Text>
          
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Icon name="schedule" size={24} color="#667eea" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Set realistic travel times</Text>
                <Text style={styles.tipDescription}>
                  Always add buffer time for traffic and unexpected delays
                </Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <Icon name="notifications" size={24} color="#667eea" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Use smart notifications</Text>
                <Text style={styles.tipDescription}>
                  Set notifications based on your typical preparation time
                </Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <Icon name="lock" size={24} color="#667eea" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Enable phone lock</Text>
                <Text style={styles.tipDescription}>
                  Lock your phone before important events to stay focused
                </Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <Icon name="sync" size={24} color="#667eea" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Keep calendar synced</Text>
                <Text style={styles.tipDescription}>
                  Regularly sync your Google Calendar for accurate event tracking
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Developer Tools Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getStrongTextShadow()]}>🔧 Developer Tools</Text>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => navigation.navigate('NotificationTest')}
          >
            <Icon name="science" size={24} color="#fff" />
            <View style={styles.testButtonContent}>
              <Text style={styles.testButtonTitle}>Notification Tests</Text>
              <Text style={styles.testButtonDescription}>
                Test all notification types and verify they work correctly
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => navigation.navigate('AwardTest')}
          >
            <Icon name="emoji-events" size={24} color="#FFD700" />
            <View style={styles.testButtonContent}>
              <Text style={styles.testButtonTitle}>Award & XP Tests</Text>
              <Text style={styles.testButtonDescription}>
                Test all achievements, XP awards, and level progression
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: CommonStyles.container,
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  pointsContainer: {
    gap: 12,
  },
  pointsItem: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  pointsAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positivePoints: {
    color: '#28a745',
  },
  negativePoints: {
    color: '#dc3545',
  },
  pointsDescription: {
    fontSize: 14,
    color: '#666',
  },
  badgesContainer: {
    gap: 15,
  },
  badgeItem: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  badgePoints: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  badgeRequirement: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  tipsContainer: {
    gap: 15,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  testButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  testButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  testButtonDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default HelpScreen;

