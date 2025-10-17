import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

class GamificationService {
  constructor() {
    this.achievements = [
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Arrive early to 10 events',
        icon: '🐦',
        xpReward: 150,
        badgeReward: 'early_bird',
        condition: { type: 'early_arrivals', count: 10 },
      },
      {
        id: 'punctuality_pro',
        title: 'Punctuality Pro',
        description: 'Maintain 95% punctuality for a week',
        icon: '⏰',
        xpReward: 200,
        badgeReward: 'punctuality_pro',
        condition: { type: 'punctuality_week', percent: 95 },
      },
      {
        id: 'streak_master',
        title: 'Streak Master',
        description: 'Complete 20 events in a row on time',
        icon: '🔥',
        xpReward: 500,
        badgeReward: 'streak_master',
        condition: { type: 'streak', count: 20 },
      },
      {
        id: 'time_guardian',
        title: 'Time Guardian',
        description: 'Use phone lock feature for 50 events',
        icon: '🛡️',
        xpReward: 300,
        badgeReward: 'time_guardian',
        condition: { type: 'phone_lock_usage', count: 50 },
      },
      {
        id: 'calendar_champion',
        title: 'Calendar Champion',
        description: 'Sync and manage 100 calendar events',
        icon: '📅',
        xpReward: 400,
        badgeReward: 'calendar_champion',
        condition: { type: 'calendar_events', count: 100 },
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Achieve 100% punctuality for a month',
        icon: '💎',
        xpReward: 1000,
        badgeReward: 'perfectionist',
        condition: { type: 'punctuality_month', percent: 100 },
      },
    ];

    this.badges = {
      early_bird: { name: 'Early Bird', description: 'Arrive early to 10 events', icon: '🐦', color: '#4CAF50' },
      punctuality_pro: { name: 'Punctuality Pro', description: 'Maintain 95% punctuality for a week', icon: '⏰', color: '#2196F3' },
      streak_master: { name: 'Streak Master', description: 'Complete 20 events in a row on time', icon: '🔥', color: '#ff6b6b' },
      time_guardian: { name: 'Time Guardian', description: 'Use phone lock feature for 50 events', icon: '🛡️', color: '#9C27B0' },
      calendar_champion: { name: 'Calendar Champion', description: 'Sync and manage 100 calendar events', icon: '📅', color: '#ff9800' },
      perfectionist: { name: 'Perfectionist', description: 'Achieve 100% punctuality for a month', icon: '💎', color: '#ffd700' },
    };
  }

  async checkAchievements(userStats) {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      const userData = userDoc.data();
      const earnedAchievements = userData.achievements || [];

      for (const achievement of this.achievements) {
        // Skip if already earned
        if (earnedAchievements.includes(achievement.id)) continue;

        // Check if condition is met
        if (await this.checkAchievementCondition(achievement, userStats, userData)) {
          await this.awardAchievement(achievement, userStats);
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  async checkAchievementCondition(achievement, userStats, userData) {
    switch (achievement.condition.type) {
      case 'events_on_time':
        return userStats.eventsOnTime >= achievement.condition.count;
      
      case 'streak':
        return userStats.currentStreak >= achievement.condition.count;
      
      case 'perfect_week':
        return await this.checkPerfectWeek(userData);
      
      case 'early_arrivals':
        return await this.checkEarlyArrivals(achievement.condition.count);
      
      case 'evening_events':
        return await this.checkEveningEvents(achievement.condition.count);
      
      case 'social_events':
        return await this.checkSocialEvents(achievement.condition.count);
      
      case 'level':
        return userStats.level >= achievement.condition.count;
      
      default:
        return false;
    }
  }

  async checkPerfectWeek(userData) {
    // Check if user was on time for all events in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', userData.uid)
      .where('startTime', '>=', firestore.Timestamp.fromDate(sevenDaysAgo))
      .where('status', '==', 'completed')
      .get();

    const events = eventsSnapshot.docs.map(doc => doc.data());
    return events.length > 0 && events.every(event => event.arrivedOnTime === true);
  }

  async checkEarlyArrivals(count) {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      const eventsSnapshot = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'completed')
        .where('wasEarly', '==', true)
        .get();

      console.log(`📊 Early arrivals found: ${eventsSnapshot.size} (need ${count})`);
      return eventsSnapshot.size >= count;
    } catch (error) {
      console.error('Error checking early arrivals:', error);
      return false;
    }
  }

  async checkPunctualityWeek(percent) {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const eventsSnapshot = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .where('startTime', '>=', firestore.Timestamp.fromDate(sevenDaysAgo))
        .where('status', '==', 'completed')
        .get();

      const totalEvents = eventsSnapshot.size;
      if (totalEvents === 0) return false;

      const onTimeEvents = eventsSnapshot.docs.filter(doc =>
        doc.data().arrivedOnTime === true
      ).length;

      const punctualityPercent = (onTimeEvents / totalEvents) * 100;
      console.log(`📊 Week punctuality: ${punctualityPercent.toFixed(1)}% (need ${percent}%)`);

      return punctualityPercent >= percent;
    } catch (error) {
      console.error('Error checking punctuality week:', error);
      return false;
    }
  }

  async checkPunctualityMonth(percent) {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const eventsSnapshot = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .where('startTime', '>=', firestore.Timestamp.fromDate(thirtyDaysAgo))
        .where('status', '==', 'completed')
        .get();

      const totalEvents = eventsSnapshot.size;
      if (totalEvents === 0) return false;

      const onTimeEvents = eventsSnapshot.docs.filter(doc =>
        doc.data().arrivedOnTime === true
      ).length;

      const punctualityPercent = (onTimeEvents / totalEvents) * 100;
      console.log(`📊 Month punctuality: ${punctualityPercent.toFixed(1)}% (need ${percent}%)`);

      return punctualityPercent >= percent;
    } catch (error) {
      console.error('Error checking punctuality month:', error);
      return false;
    }
  }

  async checkPhoneLockUsage(count) {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      const eventsSnapshot = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'completed')
        .where('usedPhoneLock', '==', true)
        .get();

      console.log(`📊 Phone lock usage: ${eventsSnapshot.size} events (need ${count})`);
      return eventsSnapshot.size >= count;
    } catch (error) {
      console.error('Error checking phone lock usage:', error);
      return false;
    }
  }

  async checkCalendarEvents(count) {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      const eventsSnapshot = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .get();

      console.log(`📊 Calendar events synced: ${eventsSnapshot.size} (need ${count})`);
      return eventsSnapshot.size >= count;
    } catch (error) {
      console.error('Error checking calendar events:', error);
      return false;
    }
  }

  async checkEveningEvents(count) {
    const currentUser = auth().currentUser;

    // Get all completed events where user was on time
    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', currentUser.uid)
      .where('status', '==', 'completed')
      .where('arrivedOnTime', '==', true)
      .get();

    // Filter for evening events (after 6 PM)
    let eveningCount = 0;
    eventsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const startTime = data.startTime.toDate();
      if (startTime.getHours() >= 18) {
        eveningCount++;
      }
    });

    return eveningCount >= count;
  }

  async checkSocialEvents(count) {
    const currentUser = auth().currentUser;
    const socialKeywords = ['meeting', 'party', 'gathering', 'social', 'team', 'group'];

    const eventsSnapshot = await firestore()
      .collection('events')
      .where('userId', '==', currentUser.uid)
      .where('status', '==', 'completed')
      .where('arrivedOnTime', '==', true)
      .get();

    let socialEventCount = 0;
    eventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      const title = event.title.toLowerCase();
      const description = (event.description || '').toLowerCase();

      if (socialKeywords.some(keyword =>
        title.includes(keyword) || description.includes(keyword)
      )) {
        socialEventCount++;
      }
    });

    return socialEventCount >= count;
  }

  async checkEventsOnTime(count) {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      const eventsSnapshot = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'completed')
        .where('arrivedOnTime', '==', true)
        .get();

      return eventsSnapshot.size >= count;
    } catch (error) {
      console.error('Error checking events on time:', error);
      return false;
    }
  }

  async checkStreak(count) {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        return (userData.currentStreak || 0) >= count;
      }
      return false;
    } catch (error) {
      console.error('Error checking streak:', error);
      return false;
    }
  }

  async awardAchievement(achievement, userStats) {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      // Add achievement to user's achievements
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          achievements: firestore.FieldValue.arrayUnion(achievement.id),
          xp: firestore.FieldValue.increment(achievement.xpReward),
        });

      // Add badge if specified
      if (achievement.badgeReward) {
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .update({
            badges: firestore.FieldValue.arrayUnion(achievement.badgeReward),
          });
      }

      // Create achievement record
      await firestore()
        .collection('achievements')
        .add({
          userId: currentUser.uid,
          achievementId: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xpReward,
          badgeReward: achievement.badgeReward,
          earnedAt: firestore.Timestamp.now(),
        });

      // Check for level up
      await this.checkLevelUp(userStats.xp + achievement.xpReward);

      // Store achievement notification
      await AsyncStorage.setItem(
        'latestAchievement',
        JSON.stringify({
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xpReward,
          timestamp: Date.now(),
        })
      );

      return true;
    } catch (error) {
      console.error('Error awarding achievement:', error);
      return false;
    }
  }

  async checkLevelUp(newXP) {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const newLevel = Math.floor(newXP / 100) + 1;
    
    const userDoc = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .get();

    const currentLevel = userDoc.data().level || 1;

    if (newLevel > currentLevel) {
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({ level: newLevel });

      // Store level up notification
      await AsyncStorage.setItem(
        'levelUp',
        JSON.stringify({
          newLevel,
          timestamp: Date.now(),
        })
      );

      return newLevel;
    }

    return null;
  }

  async addXP(amount, reason = '') {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          xp: firestore.FieldValue.increment(amount),
        });

      // Log XP gain
      await firestore()
        .collection('xp_logs')
        .add({
          userId: currentUser.uid,
          amount,
          reason,
          timestamp: firestore.Timestamp.now(),
        });

      return true;
    } catch (error) {
      console.error('Error adding XP:', error);
      return false;
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const usersSnapshot = await firestore()
        .collection('users')
        .orderBy('xp', 'desc')
        .limit(limit)
        .get();

      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  async getRecentActivity(userId, limit = 10) {
    try {
      const activitySnapshot = await firestore()
        .collection('achievements')
        .where('userId', '==', userId)
        .orderBy('earnedAt', 'desc')
        .limit(limit)
        .get();

      return activitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  async getBadgeInfo(badgeId) {
    return this.badges[badgeId] || null;
  }

  async getAllBadges() {
    return this.badges;
  }

  async getAchievementInfo(achievementId) {
    return this.achievements.find(a => a.id === achievementId) || null;
  }

  async getAllAchievements() {
    return this.achievements;
  }

  async awardPoints(points, reason) {
    const currentUser = auth().currentUser;
    if (!currentUser) return 0;

    try {
      console.log(`🏆 Awarding ${points} points for: ${reason}`);
      
      // Try to update in Firestore first
      const userRef = firestore().collection('users').doc(currentUser.uid);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const currentPoints = userDoc.data().xp || 0;
        const newPoints = currentPoints + points;
        
        await userRef.update({
          xp: newPoints,
          lastPointsUpdate: firestore.FieldValue.serverTimestamp(),
          lastPointsReason: reason,
        });
        
        console.log(`✅ Points updated in Firestore: ${currentPoints} → ${newPoints}`);
        return newPoints;
      } else {
        // Create user document if it doesn't exist
        await userRef.set({
          xp: points,
          badgeCount: 0,
          currentStreak: 0,
          punctualityScore: 0,
          lastPointsUpdate: firestore.FieldValue.serverTimestamp(),
          lastPointsReason: reason,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ New user document created with ${points} points`);
        return points;
      }
    } catch (error) {
      console.error('❌ Error awarding points in Firestore:', error);
      
      // Fallback to local storage
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const localStats = await AsyncStorage.getItem('userStats');
        let stats = localStats ? JSON.parse(localStats) : { xp: 0, badgeCount: 0, currentStreak: 0, punctualityScore: 0 };
        
        stats.xp = (stats.xp || 0) + points;
        stats.lastPointsUpdate = new Date().toISOString();
        stats.lastPointsReason = reason;
        
        await AsyncStorage.setItem('userStats', JSON.stringify(stats));
        console.log(`✅ Points saved locally: ${stats.xp} points`);
        return stats.xp;
      } catch (localError) {
        console.error('❌ Error saving points locally:', localError);
        return 0;
      }
    }
  }

  async checkAndAwardBadges() {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('⚠️ No current user, skipping badge check');
      return;
    }

    try {
      console.log('🎖️ Checking for badge eligibility...');

      // Get user stats
      const userRef = firestore().collection('users').doc(currentUser.uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const currentBadges = userData.achievements || [];

        // Check each achievement
        for (const achievement of this.achievements) {
          if (currentBadges.includes(achievement.id)) continue; // Already awarded

          let isEligible = false;

          switch (achievement.condition.type) {
            case 'events_on_time':
              isEligible = await this.checkEventsOnTime(achievement.condition.count);
              break;
            case 'streak':
              isEligible = await this.checkStreak(achievement.condition.count);
              break;
            case 'perfect_week':
              isEligible = await this.checkPerfectWeek(userData);
              break;
            case 'punctuality_week':
              isEligible = await this.checkPunctualityWeek(achievement.condition.percent);
              break;
            case 'punctuality_month':
              isEligible = await this.checkPunctualityMonth(achievement.condition.percent);
              break;
            case 'early_arrivals':
              isEligible = await this.checkEarlyArrivals(achievement.condition.count);
              break;
            case 'phone_lock_usage':
              isEligible = await this.checkPhoneLockUsage(achievement.condition.count);
              break;
            case 'calendar_events':
              isEligible = await this.checkCalendarEvents(achievement.condition.count);
              break;
          }

          if (isEligible) {
            await this.awardAchievement(achievement, userData);
            console.log(`🎖️ Badge awarded: ${achievement.title}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking badges:', error);
    }
  }
}

export default new GamificationService();

