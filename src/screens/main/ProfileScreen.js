import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
// Assuming paths are correct for the project
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import moment from 'moment';
import GamificationService from '../../services/GamificationService'; 

// Import all necessary theme components
import Theme, { 
  Colors, 
  Typography, 
  Spacing, 
  BorderRadius,
  CommonStyles,
  getTextShadow,
  getSubtleTextShadow,
  createGlassCard,
  getStatusColor,
  getGreeting,
} from '../../styles/theme';

const { width, height } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const [userStats, setUserStats] = useState({
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    totalEvents: 0,
    eventsOnTime: 0,
    punctualityScore: 0,
    badges: [],
    achievements: [],
  });
  const [userData, setUserData] = useState(null);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [badgeDetails, setBadgeDetails] = useState([]);

  // Get dynamic background and text shadow settings
  // Use a different background for profile screen - more professional/calm images
  const getProfileBackground = () => {
    const hour = new Date().getHours();
    
    // Professional/calm backgrounds suitable for profile - different from dashboard
    const profileBackgrounds = {
      earlyMorning: {
        gradient: ['#667eea', '#764ba2', '#5a4a99'],
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', // Mountain landscape
        time: 'Early Morning',
        hour: [4, 7]
      },
      morning: {
        gradient: ['#4facfe', '#00f2fe', '#43e97b'],
        image: 'https://images.unsplash.com/photo-1464822759844-d150baec4f0b?w=1200&q=80', // Forest path
        time: 'Morning',
        hour: [7, 11]
      },
      midday: {
        gradient: ['#a8edea', '#fed6e3', '#d299c2'],
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80', // Lake reflection
        time: 'Midday',
        hour: [11, 14]
      },
      afternoon: {
        gradient: ['#ffecd2', '#fcb69f', '#ff8a80'],
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', // Sunset mountains
        time: 'Afternoon',
        hour: [14, 17]
      },
      evening: {
        gradient: ['#667eea', '#764ba2', '#5a4a99'],
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', // Purple sky
        time: 'Evening',
        hour: [17, 19]
      },
      dusk: {
        gradient: ['#2c3e50', '#34495e', '#2c3e50'],
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', // Dark forest
        time: 'Dusk',
        hour: [19, 21]
      },
      night: {
        gradient: ['#1e3c72', '#2a5298', '#1e3c72'],
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', // Night sky
        time: 'Night',
        hour: [21, 23]
      },
      lateNight: {
        gradient: ['#0f0c29', '#302b63', '#24243e'],
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', // Deep night
        time: 'Late Night',
        hour: [23, 4]
      }
    };
    
    for (const [key, config] of Object.entries(profileBackgrounds)) {
      const [start, end] = config.hour;
      if (start <= end) {
        if (hour >= start && hour < end) return config;
      } else {
        if (hour >= start || hour < end) return config;
      }
    }
    
    return profileBackgrounds.midday;
  };

  const profileGradient = ['#0ea5e9', '#0369a1', '#00172a'];
  const greeting = getGreeting();
  
  // Use text shadow helper functions based on where the text is
  const headerTextShadow = getTextShadow();
  const cardTextShadow = getSubtleTextShadow();

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    // Set basic user data from Firebase Auth
    setUserData({
      displayName: currentUser.displayName || 'OnTime Hero',
      email: currentUser.email,
      photoURL: currentUser.photoURL,
    });

    try {
      // Load user document
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      // Load all events to calculate real stats
      const eventsQuery = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .get();

      const allEvents = eventsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('📊 Profile: Loaded events for stats calculation:', allEvents.length);

      // Calculate real stats from events
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let currentStreak = 0;
      let longestStreak = 0;
      let totalEvents = allEvents.length;
      let eventsOnTime = 0;
      let punctualityScore = 0;

      // Calculate streaks and punctuality
      if (allEvents.length > 0) {
        // Sort events by date (most recent first)
        const sortedEvents = allEvents.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        // Calculate current streak (consecutive days with on-time events)
        let tempStreak = 0;
        let maxStreak = 0;
        let currentDate = null;
        
        for (const event of sortedEvents) {
          const eventDate = new Date(event.startTime);
          const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          
          // Check if event is on time (success, onTime, completed, arrivedOnTime, arrivedEarly)
          const isOnTime = ['success', 'onTime', 'completed', 'arrivedOnTime', 'arrivedEarly'].includes(event.status);
          
          if (isOnTime) {
            eventsOnTime++;
            
            if (currentDate === null) {
              currentDate = eventDay;
              tempStreak = 1;
              maxStreak = Math.max(maxStreak, tempStreak);
            } else if (eventDay.getTime() === currentDate.getTime()) {
              // Same day, continue streak
              maxStreak = Math.max(maxStreak, tempStreak);
            } else {
              // Check if it's consecutive day
              const dayDiff = Math.floor((currentDate - eventDay) / (1000 * 60 * 60 * 24));
              if (dayDiff === 1) {
                tempStreak++;
                maxStreak = Math.max(maxStreak, tempStreak);
                currentDate = eventDay;
              } else {
                // Streak broken
                if (currentStreak === 0) currentStreak = tempStreak; // Set current streak
                longestStreak = Math.max(longestStreak, maxStreak);
                tempStreak = 1;
                currentDate = eventDay;
              }
            }
          }
        }
        
        // Set final streaks
        if (currentStreak === 0) currentStreak = tempStreak;
        longestStreak = Math.max(longestStreak, maxStreak);
        
        // Calculate punctuality score
        punctualityScore = totalEvents > 0 ? Math.round((eventsOnTime / totalEvents) * 100) : 0;
      }

      console.log('📊 Profile: Calculated stats:', {
        currentStreak,
        longestStreak,
        totalEvents,
        eventsOnTime,
        punctualityScore
      });

      // Get user document data
      let userData = {};
      if (userDoc.exists) {
        userData = userDoc.data();
        
        // Update user data with Firestore data
        setUserData({
          displayName: userData.displayName || currentUser.displayName || 'OnTime Hero',
          email: userData.email || currentUser.email,
          photoURL: userData.photoURL || currentUser.photoURL,
        });
      }
      
      const stats = {
        xp: userData.xp || 0,
        level: userData.level || 1,
        currentStreak: currentStreak,
        longestStreak: longestStreak,
        totalEvents: totalEvents,
        eventsOnTime: eventsOnTime,
        punctualityScore: punctualityScore,
        badges: userData.badges || [],
        achievements: userData.achievements || [],
      };
      setUserStats(stats);

      // Load badge details from GamificationService
      const allBadges = await GamificationService.getAllBadges();
      const userBadgeDetails = (userData.badges || []).map(badgeId => ({
        id: badgeId,
        ...allBadges[badgeId]
      })).filter(badge => badge.name); // Filter out invalid badges
      setBadgeDetails(userBadgeDetails);

      console.log('📊 User badges:', userData.badges);
      console.log('📊 Badge details:', userBadgeDetails);

      // Load recent achievements
      const recentAchievementsData = await firestore()
        .collection('achievements')
        .where('userId', '==', currentUser.uid)
        .orderBy('earnedAt', 'desc')
        .limit(5)
        .get();

      setRecentAchievements(recentAchievementsData.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })));
    } catch (error) {
      console.error('Error loading user stats:', error);
      
      // Try to load from local storage on error
      if (error.code === 'unavailable') {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const localProfile = await AsyncStorage.getItem('userProfile');
          if (localProfile) {
            const profileData = JSON.parse(localProfile);
            setUserData({
              displayName: profileData.displayName || 'OnTime Hero',
              email: profileData.email,
              photoURL: profileData.photoURL,
            });
          }
        } catch (localError) {
          console.error('Error loading local user data:', localError);
        }
      }
    }
  };

  const getLevelProgress = () => {
    const currentLevelXP = (userStats.level - 1) * 100;
    const nextLevelXP = userStats.level * 100;
    const progress = ((userStats.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(progress, 100);
  };

  const getLevelColor = () => {
    // Using a more defined accent for the avatar background
    if (userStats.level >= 10) return ['#FFD700', '#FFED4E']; // Gold
    if (userStats.level >= 5) return ['#4CAF50', '#66bb6a'];  // Success Green
    return ['#2196F3', '#42a5f5']; // Info Blue
  };

  const getPunctualityStatus = () => {
    if (userStats.punctualityScore >= 90) return 'success';
    if (userStats.punctualityScore >= 70) return 'warning';
    return 'danger';
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderBadge = (badge, index) => {
    // Dynamic glass card creation for badges
    const status = ['success', 'info', 'warning', 'danger'][index % 4];
    const cardStyle = createGlassCard(status, 'small');
    
    // Check if icon is an emoji or Material Icon name
    const isEmoji = badge.icon && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(badge.icon);

    return (
      <View key={badge.id} style={styles.badgeContainer}>
        <View style={[styles.badgeGlass, cardStyle, {padding: Spacing.sm}]}>
          <LinearGradient colors={[getStatusColor(status), Colors.text.tertiary]} style={styles.badgeIconGradient}>
            {isEmoji ? (
              <Text style={styles.badgeEmoji}>{badge.icon}</Text>
            ) : (
              <Icon name={badge.icon || 'emoji-events'} size={24} color={Colors.text.primary} />
            )}
          </LinearGradient>
          <Text style={[styles.badgeName, cardTextShadow]}>{badge.name}</Text>
          <Text style={[styles.badgeDescription, styles.textHint]}>{badge.description}</Text>
        </View>
      </View>
    );
  };

  const renderAchievement = (achievement) => (
    // Status color for achievements can be 'success'
    <View key={achievement.id} style={[styles.achievementContainer, createGlassCard('success')]}>
      <Icon name={achievement.icon || 'trophy'} size={24} color={getStatusColor('success')} style={{marginRight: Spacing.base}} />
      <View style={styles.achievementContent}>
        <Text style={[Typography.h5, cardTextShadow]}>{achievement.title}</Text>
        <Text style={[Typography.caption, styles.textHint]}>
          Earned {moment(achievement.earnedAt.toDate()).fromNow()}
        </Text>
      </View>
      <View style={styles.achievementXPBadge}>
        <Text style={[Typography.caption, styles.achievementXPText]}>+{achievement.xpReward} XP</Text>
      </View>
    </View>
  );

  return (
    <View style={CommonStyles.container}>
      <LinearGradient
        colors={profileGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientOverlay}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Header over photo area */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={[Typography.h2, headerTextShadow]}>
                {greeting}
              </Text>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Icon name="logout" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                {userData?.photoURL ? (
                  <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient colors={getLevelColor()} style={styles.avatar}>
                    <Text style={[Typography.h2, headerTextShadow]}>
                      {userStats.level}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={[Typography.h3, headerTextShadow]}>{userData?.displayName || 'OnTime Hero'}</Text>
                <Text style={[Typography.body, styles.textSecondary]}>{userData?.email}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[Typography.h5, headerTextShadow]}>Level {userStats.level}</Text>
                  <Text style={[Typography.caption, styles.textHint]}>{userStats.xp} / {userStats.level * 100} XP</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Level Progress Card - Full Width */}
          <View style={[styles.section, createGlassCard('info', 'large')]}>
            <View style={CommonStyles.rowBetween}>
              <Text style={[Typography.h4, cardTextShadow]}>Level Progress</Text>
              <Text style={[Typography.body, styles.textSecondary]}>
                {userStats.xp} / {userStats.level * 100} XP
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { 
                      width: `${getLevelProgress()}%`,
                      backgroundColor: getStatusColor('info'),
                    }
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Stats Grid - 2x2 Layout */}
          <View style={styles.statsGrid}>
            <StatPill 
                icon="local-fire-department" 
                value={userStats.currentStreak} 
                label="Current Streak" 
                color={getStatusColor('warning')}
            />
            <StatPill 
                icon="military-tech" 
                value={userStats.longestStreak} 
                label="Longest Streak" 
                color={Colors.accent.gold}
            />
            <StatPill 
                icon="check-circle" 
                value={`${userStats.punctualityScore}%`} 
                label="Punctuality" 
                color={getStatusColor(getPunctualityStatus())}
            />
            <StatPill 
                icon="event" 
                value={userStats.totalEvents} 
                label="Total Events" 
                color={getStatusColor('neutral')} 
            />
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.actionItem, createGlassCard('neutral')]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="settings" size={24} color={Colors.text.primary} />
              <Text style={[Typography.body, styles.actionText]}>Settings</Text>
              <Icon name="chevron-right" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionItem, createGlassCard('neutral')]}
              onPress={() => navigation.navigate('HelpScreen')}
            >
              <Icon name="help" size={24} color={Colors.text.primary} />
              <Text style={[Typography.body, styles.actionText]}>Help</Text>
              <Icon name="chevron-right" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Recent Achievements */}
          {recentAchievements.length > 0 && (
            <View style={styles.section}>
              <Text style={[Typography.h3, styles.sectionTitle]}>🏆 Recent Achievements</Text>
              {recentAchievements.map(renderAchievement)}
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={[Typography.body, styles.textSecondary]}>View All Achievements</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Badges */}
          {badgeDetails.length > 0 && (
            <View style={styles.section}>
              <Text style={[Typography.h3, styles.sectionTitle]}>🎖️ Badges ({badgeDetails.length})</Text>
              <View style={styles.badgesGrid}>
                {badgeDetails.map(renderBadge)}
              </View>
            </View>
          )}


        </ScrollView>
      </LinearGradient>
    </View>
  );
};


// Custom Stat Pill component for the grid
const StatPill = ({ icon, value, label, color }) => (
    <View style={[styles.statPillContainer, CommonStyles.glassCardSmall]}>
        <Icon name={icon} size={28} color={color} style={styles.iconMargin} />
        <Text style={[Typography.h2, getSubtleTextShadow()]}>{value}</Text>
        <Text style={[Typography.caption, {color: Colors.text.tertiary}]}>{label}</Text>
    </View>
);


// Refactored Stylesheet using Theme constants
const styles = StyleSheet.create({
  // Use CommonStyles.container for flex: 1 and styles.gradientOverlay for all content
  gradientOverlay: {
    flex: 1,
  },
  scrollContent: {
    ...CommonStyles.scrollContent,
    paddingTop: Spacing.xl, // Give space below the top of the screen
  },
  
  // --- Header & Profile ---
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerTop: {
    ...CommonStyles.rowBetween,
    marginBottom: Spacing.lg,
  },
  logoutButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.full,
  },
  profileInfo: CommonStyles.row,
  avatarContainer: {
    marginRight: Spacing.lg,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent.white,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.accent.white,
  },
  userInfo: {
    flex: 1,
  },
  levelInfo: {
    marginTop: Spacing.sm,
  },

  // --- Sections and Cards ---
  section: {
    ...CommonStyles.section,
    marginHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.base,
  },

  // --- Level Progress ---
  progressBarContainer: {
    marginTop: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.glass.clear,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.xs,
  },

  // --- Stats Grid ---
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  statPillContainer: {
    width: '48%', // Simple 48% width for 2 columns with gap
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconMargin: {
      marginBottom: Spacing.sm,
  },

  // --- Achievements ---
  achievementContainer: CommonStyles.rowBetween,
  achievementContent: {
    flex: 1,
    marginRight: Spacing.base,
  },
  achievementXPBadge: {
    backgroundColor: Colors.accent.gold,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  achievementXPText: {
    color: '#000', // Black text for gold badge for contrast
    fontWeight: Typography.weight.bold,
  },
  viewAllButton: {
    marginTop: Spacing.base,
    alignSelf: 'flex-start',
    padding: Spacing.sm,
  },

  // --- Badges ---
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  badgeContainer: {
    width: (width - (Spacing.lg * 2) - Spacing.md) / 2,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badgeGlass: {
    width: '100%',
    alignItems: 'center',
  },
  badgeIconGradient: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badgeEmoji: {
    fontSize: Typography.size.xl,
    // No shadow needed as it's on a solid background
  },
  badgeName: {
    ...Typography.body,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDescription: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.text.tertiary, // Use tertiary for subtle text
  },

  // --- Actions ---
  actionItem: {
    ...CommonStyles.rowBetween,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
  },
  actionText: {
    flex: 1,
    marginLeft: Spacing.base,
  },
  
  // --- Text Helpers ---
  textSecondary: {
    color: Colors.text.secondary,
  },
  textHint: {
    color: Colors.text.hint,
  },
});

export default ProfileScreen;