import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

class GamificationService {
  constructor() {
    // Achievements as per playbook
    this.achievements = [
      {
        id: 'first_steps',
        title: 'First Steps',
        description: 'Complete first event on time',
        icon: '👣',
        xpReward: 50,
        badgeReward: 'first_steps',
        condition: { type: 'first_on_time', count: 1 },
      },
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Arrive early to an event',
        icon: '🐦',
        xpReward: 100,
        badgeReward: 'early_bird',
        condition: { type: 'early_arrivals', count: 1 },
      },
      {
        id: 'punctual_pro',
        title: 'Punctuality Pro',
        description: 'Complete 5 events on time',
        icon: '⏰',
        xpReward: 200,
        badgeReward: 'punctual_pro',
        condition: { type: 'on_time_arrivals', count: 5 },
      },
      {
        id: 'perfect_week',
        title: 'Perfect Week',
        description: 'Maintain 7-day on-time streak',
        icon: '🔥',
        xpReward: 300,
        badgeReward: 'perfect_week',
        condition: { type: 'streak', count: 7 },
      },
      {
        id: 'focused_mind',
        title: 'Focused Mind',
        description: 'Use focus mode for first time',
        icon: '🧘',
        xpReward: 50,
        badgeReward: 'focused_mind',
        condition: { type: 'focus_mode_usage', count: 1 },
      },
      {
        id: 'time_master',
        title: 'Time Master',
        description: 'Reach Level 10',
        icon: '👑',
        xpReward: 500,
        badgeReward: 'time_master',
        condition: { type: 'level', count: 10 },
      },
      {
        id: 'voice_commander',
        title: 'Voice Commander',
        description: 'Create 5 events using voice assistant',
        icon: '🎤',
        xpReward: 150,
        badgeReward: 'voice_commander',
        condition: { type: 'voice_events', count: 5 },
      },
    ];

    this.badges = {
      // Client-side achievements
      first_steps:     { name: 'First Steps',      description: 'First on-time event',         icon: '👣', color: '#4CAF50' },
      early_bird:      { name: 'Early Bird',        description: 'Arrived early',               icon: '🐦', color: '#FFD700' },
      punctual_pro:    { name: 'Punctuality Pro',   description: '5 events on time',            icon: '⏰', color: '#2196F3' },
      perfect_week:    { name: 'Perfect Week',      description: '7-day streak',                icon: '🔥', color: '#FF5722' },
      focused_mind:    { name: 'Focused Mind',      description: 'Used focus mode',             icon: '🧘', color: '#9C27B0' },
      time_master:     { name: 'Time Master',       description: 'Reached Level 10',            icon: '👑', color: '#FFD700' },
      voice_commander: { name: 'Voice Commander',   description: '5 voice events',              icon: '🎤', color: '#E91E63' },
      // Cloud Function — event milestones
      event_1:         { name: 'First Mission',     description: 'Created first event',         icon: '🚀', color: '#4CAF50' },
      event_10:        { name: 'Seasoned Hero',     description: '10 events created',           icon: '🦸', color: '#2196F3' },
      event_50:        { name: 'OnTime Legend',     description: '50 events created',           icon: '🏆', color: '#FFD700' },
      // Cloud Function — streak milestones
      streak_3:        { name: '3 Day Streak',      description: '3 days on time in a row',     icon: '🔥', color: '#FF9800' },
      streak_7:        { name: 'Week Warrior',      description: '7 days on time in a row',     icon: '⚡', color: '#FF5722' },
      streak_14:       { name: 'Fortnight Fighter', description: '14 days on time in a row',    icon: '💪', color: '#F44336' },
      streak_30:       { name: 'Monthly Master',    description: '30 days on time in a row',    icon: '🌟', color: '#E91E63' },
      // Cloud Function — punctuality milestones
      punctual_80:     { name: 'Reliable',          description: '80% punctuality score',       icon: '✅', color: '#4CAF50' },
      punctual_90:     { name: 'Time Champion',     description: '90% punctuality score',       icon: '🥈', color: '#2196F3' },
      punctual_95:     { name: 'Chronometer',       description: '95% punctuality score',       icon: '🥇', color: '#FF9800' },
      punctual_100:    { name: 'Perfect Timer',     description: '100% punctuality score',      icon: '💎', color: '#9C27B0' },
    };
  }

  // Calculate level from XP (Cumulative: Level 1 = 100 XP, Level 2 = 300 XP, Level 3 = 600 XP, etc.)
  // Formula: Level N requires cumulative XP = 100 * N * (N + 1) / 2
  calculateLevel(xp) {
    // Solve for level using quadratic formula
    // Total XP for level N = 100 * N * (N+1) / 2 = 50 * N^2 + 50 * N
    // Rearrange: 50*N^2 + 50*N - xp = 0 => N^2 + N - (xp/50) = 0
    // Using quadratic formula: N = (-1 + sqrt(1 + 4*xp/50)) / 2
    const level = Math.floor((-1 + Math.sqrt(1 + (xp / 12.5))) / 2);
    return Math.max(1, level);
  }

  // Calculate total XP needed to reach a specific level
  calculateTotalXPForLevel(level) {
    // Sum from i=1 to N of (i * 100) = 100 * N*(N+1)/2
    return 100 * level * (level + 1) / 2;
  }

  // Calculate XP needed for next level
  calculateXPForNextLevel(currentXP) {
    const currentLevel = this.calculateLevel(currentXP);
    const nextLevelTotalXP = this.calculateTotalXPForLevel(currentLevel + 1);
    return nextLevelTotalXP - currentXP;
  }

  // Award points for specific actions
  async awardPoints(points, reason, eventData = null) {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('❌ No user logged in for points');
        return;
      }

      console.log(`🎯 Awarding ${points} points for: ${reason}`);

      // Get current user data
      const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
      const currentXP = userDoc.exists ? (userDoc.data().xp || 0) : 0;
      const newXP = currentXP + points;
      const oldLevel = this.calculateLevel(currentXP);
      const newLevel = this.calculateLevel(newXP);

      // Update user document
      await firestore().collection('users').doc(currentUser.uid).set({
        xp: newXP,
        level: newLevel,
        lastPointsUpdate: firestore.FieldValue.serverTimestamp(),
        lastPointsReason: reason,
      }, { merge: true });

      // Log XP gain
      await firestore().collection('xp_logs').add({
        userId: currentUser.uid,
        points: points,
        reason: reason,
        timestamp: firestore.FieldValue.serverTimestamp(),
        eventData: eventData,
      });

      // Check for level up
      if (newLevel > oldLevel) {
        await this.handleLevelUp(newLevel, newXP);
      }

      // Emit points update event
      DeviceEventEmitter.emit('POINTS_UPDATED', {
        points: newXP,
        level: newLevel,
        pointsAwarded: points,
        reason: reason,
        levelUp: newLevel > oldLevel,
      });

      console.log(`✅ Points awarded: ${points} (Total: ${newXP}, Level: ${newLevel})`);
      return { points: newXP, level: newLevel, levelUp: newLevel > oldLevel };
    } catch (error) {
      console.error('❌ Error awarding points:', error);
      throw error;
    }
  }

  // Handle level up
  async handleLevelUp(newLevel, newXP) {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      console.log(`🎉 Level up! New level: ${newLevel}`);

      // Store level up notification
      await AsyncStorage.setItem('levelUp', JSON.stringify({
        level: newLevel,
        xp: newXP,
        timestamp: new Date().toISOString(),
      }));

      // Emit level up event
      DeviceEventEmitter.emit('LEVEL_UP', {
        level: newLevel,
        xp: newXP,
      });

      // Check for level-based achievements
      await this.checkAchievements();
    } catch (error) {
      console.error('❌ Error handling level up:', error);
    }
  }

  // Award points for event completion (per playbook)
  async awardEventPoints(event) {
    try {
      if (!event || event.status !== 'completed') return;

      let points = 0;
      let reason = '';

      if (event.arrivedOnTime === true) {
        if (event.wasEarly === true) {
          points = 100; // Event completed early (per playbook)
          reason = 'Event completed early';
        } else {
          points = 50; // Event completed on time (per playbook)
          reason = 'Event completed on time';
        }
      } else {
        points = 0; // No points for being late
        reason = 'Arrived late to event';
      }

      if (points > 0) {
        await this.awardPoints(points, reason, {
          eventId: event.id,
          eventTitle: event.title,
          eventLocation: event.location,
        });
      }

      // Check for achievements
      await this.checkAchievements();

      return points;
    } catch (error) {
      console.error('❌ Error awarding event points:', error);
    }
  }

  // Award points for event creation (per playbook: 10 XP)
  async awardEventCreationPoints(eventId, eventTitle) {
    try {
      const points = 10;
      const reason = 'Event created';

      await this.awardPoints(points, reason, {
        eventId,
        eventTitle,
      });

      return points;
    } catch (error) {
      console.error('❌ Error awarding event creation points:', error);
    }
  }

  // Award points for focus mode usage (per playbook: 20 XP)
  async awardFocusModePoints() {
    try {
      const points = 20;
      const reason = 'Focus mode used';

      await this.awardPoints(points, reason);
      await this.checkAchievements();

      return points;
    } catch (error) {
      console.error('❌ Error awarding focus mode points:', error);
    }
  }

  // Check and award achievements
  async checkAchievements() {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const currentAchievements = userData.achievements || [];
      const currentXP = userData.xp || 0;

      for (const achievement of this.achievements) {
        if (currentAchievements.includes(achievement.id)) continue;

        const isEarned = await this.checkAchievementCondition(achievement, currentUser.uid);
        if (isEarned) {
          await this.awardAchievement(achievement, currentUser.uid, currentXP);
        }
      }
    } catch (error) {
      console.error('❌ Error checking achievements:', error);
    }
  }

  // Check if achievement condition is met
  async checkAchievementCondition(achievement, userId) {
    try {
      const { type, count, percent } = achievement.condition;

      switch (type) {
        case 'first_on_time':
          return await this.checkOnTimeArrivals(userId, count);
        case 'early_arrivals':
          return await this.checkEarlyArrivals(userId, count);
        case 'on_time_arrivals':
          return await this.checkOnTimeArrivals(userId, count);
        case 'streak':
          return await this.checkStreak(userId, count);
        case 'focus_mode_usage':
          return await this.checkFocusModeUsage(userId, count);
        case 'level':
          return await this.checkLevel(userId, count);
        case 'voice_events':
          return await this.checkVoiceEvents(userId, count);
        case 'phone_lock_usage':
          return await this.checkPhoneLockUsage(userId, count);
        case 'calendar_events':
          return await this.checkCalendarEvents(userId, count);
        case 'evening_events':
          return await this.checkEveningEvents(userId, count);
        case 'social_events':
          return await this.checkSocialEvents(userId, count);
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Error checking achievement condition:', error);
      return false;
    }
  }

  // Check early arrivals
  async checkEarlyArrivals(userId, requiredCount) {
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .where('wasEarly', '==', true)
      .get();
    
    return eventsSnapshot.docs.length >= requiredCount;
  }

  // Check on-time arrivals
  async checkOnTimeArrivals(userId, requiredCount) {
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .where('arrivedOnTime', '==', true)
      .get();
    
    return eventsSnapshot.docs.length >= requiredCount;
  }

  // Check streak
  async checkStreak(userId, requiredDays) {
    const userDoc = await firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) return false;
    
    const currentStreak = userDoc.data().currentStreak || 0;
    return currentStreak >= requiredDays;
  }

  // Check phone lock usage
  async checkPhoneLockUsage(userId, requiredCount) {
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .where('usedPhoneLock', '==', true)
      .get();
    
    return eventsSnapshot.docs.length >= requiredCount;
  }

  // Check calendar events
  async checkCalendarEvents(userId, requiredCount) {
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userId)
      .get();
    
    return eventsSnapshot.docs.length >= requiredCount;
  }

  // Check evening events
  async checkEveningEvents(userId, requiredCount) {
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .get();
    
    let eveningCount = 0;
    eventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      const eventTime = event.startTime?.toDate ? event.startTime.toDate() : new Date(event.startTime);
      const hour = eventTime.getHours();
      if (hour >= 18 || hour <= 6) { // Evening/night events
        eveningCount++;
      }
    });
    
    return eveningCount >= requiredCount;
  }

  // Check social events
  async checkSocialEvents(userId, requiredCount) {
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .get();

    let socialCount = 0;
    eventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      const title = event.title?.toLowerCase() || '';
      const description = event.description?.toLowerCase() || '';

      // Check for social keywords
      const socialKeywords = ['meeting', 'party', 'dinner', 'lunch', 'coffee', 'drinks', 'social', 'friend', 'family', 'date'];
      const isSocial = socialKeywords.some(keyword =>
        title.includes(keyword) || description.includes(keyword)
      );

      if (isSocial) socialCount++;
    });

    return socialCount >= requiredCount;
  }

  // Check focus mode usage
  async checkFocusModeUsage(userId, requiredCount) {
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userId)
      .where('usedPhoneLock', '==', true)
      .get();

    return eventsSnapshot.docs.length >= requiredCount;
  }

  // Check level
  async checkLevel(userId, requiredLevel) {
    const userDoc = await firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) return false;

    const currentLevel = userDoc.data().level || 1;
    return currentLevel >= requiredLevel;
  }

  // Check voice events
  async checkVoiceEvents(userId, requiredCount) {
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userId)
      .where('createdByVoice', '==', true)
      .get();

    return eventsSnapshot.docs.length >= requiredCount;
  }

  // Award achievement
  async awardAchievement(achievement, userId, currentXP) {
    try {
      console.log(`🏆 Achievement earned: ${achievement.title}`);

      // Update user document
      await firestore().collection('users').doc(userId).update({
        achievements: firestore.FieldValue.arrayUnion(achievement.id),
        badges: firestore.FieldValue.arrayUnion(achievement.badgeReward),
        xp: currentXP + achievement.xpReward,
        level: this.calculateLevel(currentXP + achievement.xpReward),
      });

      // Create achievement record
      await firestore().collection('achievements').add({
        userId: userId,
        achievementId: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        badgeReward: achievement.badgeReward,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

      // Store achievement notification
      await AsyncStorage.setItem('latestAchievement', JSON.stringify({
        ...achievement,
        timestamp: new Date().toISOString(),
      }));

      // Emit achievement event
      DeviceEventEmitter.emit('ACHIEVEMENT_EARNED', {
        ...achievement,
        newXP: currentXP + achievement.xpReward,
        newLevel: this.calculateLevel(currentXP + achievement.xpReward),
      });

      console.log(`✅ Achievement awarded: ${achievement.title} (+${achievement.xpReward} XP)`);
    } catch (error) {
      console.error('❌ Error awarding achievement:', error);
    }
  }

  // Get user stats
  async getUserStats() {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return null;

      const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
      if (!userDoc.exists) return null;

      const userData = userDoc.data();
      const xp = userData.xp || 0;
      const level = this.calculateLevel(xp);
      const xpForNextLevel = this.calculateXPForNextLevel(xp);

      return {
        xp,
        level,
        xpForNextLevel,
        achievements: userData.achievements || [],
        badges: userData.badges || [],
        currentStreak: userData.currentStreak || 0,
        punctualityScore: userData.punctualityScore || 0,
      };
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      return null;
    }
  }

  // Get recent activity
  async getRecentActivity(limit = 10) {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return [];

      const achievementsSnapshot = await firestore()
        .collection('achievements')
        .where('userId', '==', currentUser.uid)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return achievementsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('❌ Error getting recent activity:', error);
      return [];
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 10) {
    try {
      const usersSnapshot = await firestore()
        .collection('users')
        .orderBy('xp', 'desc')
        .limit(limit)
        .get();

      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        xp: doc.data().xp || 0,
        level: this.calculateLevel(doc.data().xp || 0),
        displayName: doc.data().displayName || 'Anonymous',
      }));
    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      return [];
    }
  }

  // Get all available badges
  getAllBadges() {
    return Object.values(this.badges);
  }

  // Get user's earned badges
  async getUserBadges() {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return [];

      const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
      if (!userDoc.exists) return [];

      const userData = userDoc.data();
      const userBadgeIds = userData.badges || [];

      return userBadgeIds.map(badgeId => this.badges[badgeId]).filter(Boolean);
    } catch (error) {
      console.error('❌ Error getting user badges:', error);
      return [];
    }
  }

  // Reset all user gamification data
  async resetUserData() {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('❌ No user logged in to reset data');
        return false;
      }

      console.log('🔄 Resetting all gamification data for user:', currentUser.uid);

      // Reset Firestore user document
      await firestore().collection('users').doc(currentUser.uid).set({
        xp: 0,
        level: 1,
        achievements: [],
        badges: [],
        currentStreak: 0,
        longestStreak: 0,
        punctualityScore: 0,
        lastPointsUpdate: firestore.FieldValue.serverTimestamp(),
        lastPointsReason: 'Data reset',
      }, { merge: true });

      // Delete all XP logs
      const xpLogsSnapshot = await firestore()
        .collection('xp_logs')
        .where('userId', '==', currentUser.uid)
        .get();

      const xpLogDeletePromises = xpLogsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(xpLogDeletePromises);
      console.log(`🗑️ Deleted ${xpLogsSnapshot.docs.length} XP logs`);

      // Delete all achievements
      const achievementsSnapshot = await firestore()
        .collection('achievements')
        .where('userId', '==', currentUser.uid)
        .get();

      const achievementDeletePromises = achievementsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(achievementDeletePromises);
      console.log(`🗑️ Deleted ${achievementsSnapshot.docs.length} achievements`);

      // Clear AsyncStorage cached data
      await AsyncStorage.removeItem('levelUp');
      await AsyncStorage.removeItem('latestAchievement');
      console.log('🗑️ Cleared AsyncStorage cache');

      // Emit reset event
      DeviceEventEmitter.emit('GAMIFICATION_RESET', {
        xp: 0,
        level: 1,
      });

      console.log('✅ All gamification data reset successfully');
      return true;
    } catch (error) {
      console.error('❌ Error resetting user data:', error);
      return false;
    }
  }
}

export default new GamificationService();