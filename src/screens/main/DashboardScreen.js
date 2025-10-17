import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  AppState,
} from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import moment from 'moment';
import NextEventCard from '../../components/dashboard/NextEventCard';
import StreakWidget from '../../components/dashboard/StreakWidget';
import QuickStats from '../../components/dashboard/QuickStats';
import GoogleCalendarService from '../../services/GoogleCalendarService';
import GamificationService from '../../services/GamificationService';
import NotificationService from '../../services/NotificationService';
import LocationService from '../../services/LocationService';

const DashboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [nextEvent, setNextEvent] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]); // Add recent events state
  const [stats, setStats] = useState({
    points: 0,
    badges: 0,
    punctualityRate: 0,
    currentStreak: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [settingsClickCount, setSettingsClickCount] = useState(0);
  const [firestoreStatus, setFirestoreStatus] = useState('connected'); // Track Firestore status
  const refreshIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Utility function to retry Firestore operations
  const retryFirestoreOperation = async (operation, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
          if (i < maxRetries - 1) {
            console.log(`🔄 Retrying Firestore operation (attempt ${i + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
          } else {
            console.log('❌ Firestore operation failed after all retries');
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
  };

  useEffect(() => {
    initializeDashboard();
    
    // Set up automatic refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      console.log('Auto-refreshing dashboard...');
      loadNextEvent();
    }, 30000); // 30 seconds

    // Listen for app state changes
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App came to foreground, refreshing dashboard...');
        loadNextEvent();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Listen for navigation focus to refresh when user comes to this screen
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('Dashboard screen focused, refreshing events...');
      loadNextEvent();
      loadRecentEvents(); // Also refresh recent events
    });

    // Listen for saved route updates to refresh nextEvent immediately
    const sub = DeviceEventEmitter.addListener('EVENT_ROUTE_UPDATED', (updatedEvent) => {
      setNextEvent(prev => prev && prev.id === updatedEvent.id ? { ...prev, origin: updatedEvent.origin, location: updatedEvent.location } : prev);
    });

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      subscription?.remove();
      unsubscribeFocus();
      sub.remove();
    };
  }, []);

  const initializeDashboard = async () => {
    setGreeting(getGreeting());
    await loadUserData();
    await loadNextEvent();
    await loadRecentEvents();
    // Trigger calendar sync on startup
    await syncCalendarData();
  };

  const syncCalendarData = async () => {
    try {
      console.log('🔄 Starting calendar sync on dashboard load...');
      const calendarService = GoogleCalendarService;
      await calendarService.syncCalendarEvents();
      console.log('✅ Calendar sync completed, reloading events...');
      // Reload events after sync
      await loadNextEvent();
      console.log('✅ Events reloaded after calendar sync');
    } catch (error) {
      console.error('❌ Error syncing calendar on dashboard load:', error);
      console.error('❌ Calendar sync error details:', error.message);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadUserData = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    // First, set basic user data from Firebase Auth
    const basicUserData = {
      displayName: currentUser.displayName,
      email: currentUser.email,
      photoURL: currentUser.photoURL,
      uid: currentUser.uid,
    };
    setUser(basicUserData);

    try {
      // Check if Firestore is available with retry logic
      const userDoc = await retryFirestoreOperation(async () => {
        await firestore().enableNetwork();
        return await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();
      });
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Merge Firestore data with basic user data
        const mergedUserData = {
          ...basicUserData,
          ...userData,
        };
        setUser(mergedUserData);

        // Calculate punctuality rate from events
        const calculatePunctualityRate = async () => {
          try {
            const eventsSnapshot = await firestore()
              .collection('events')
              .where('userId', '==', currentUser.uid)
              .where('status', '==', 'completed')
              .get();

            const totalEvents = eventsSnapshot.size;
            if (totalEvents === 0) return 0;

            const onTimeEvents = eventsSnapshot.docs.filter(doc =>
              doc.data().arrivedOnTime === true
            ).length;

            return Math.round((onTimeEvents / totalEvents) * 100);
          } catch (error) {
            console.error('Error calculating punctuality:', error);
            return userData.punctualityScore || 0;
          }
        };

        const punctualityRate = await calculatePunctualityRate();

        setStats({
          points: userData.xp || 0,
          badges: (userData.badges || []).length,
          punctualityRate: punctualityRate,
          currentStreak: userData.currentStreak || 0,
        });
        setFirestoreStatus('connected');
        console.log('✅ User data loaded successfully from Firestore');
      }
    } catch (error) {
      console.error('❌ Error loading user stats:', error);
      
      // If Firestore is unavailable, try to load from local storage
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        console.log('⚠️ Firestore temporarily unavailable, loading user data from local storage');
        setFirestoreStatus('unavailable');
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const localProfile = await AsyncStorage.getItem('userProfile');
          if (localProfile) {
            const profileData = JSON.parse(localProfile);
            // Merge local data with basic user data
            const mergedUserData = {
              ...basicUserData,
              ...profileData,
            };
            setUser(mergedUserData);
            setStats({
              points: profileData.xp || 0,
              badges: profileData.badgeCount || 0,
              punctualityRate: profileData.punctualityScore || 0,
              currentStreak: profileData.currentStreak || 0,
            });
          }
        } catch (localError) {
          console.error('Error loading local user data:', localError);
        }
      }
    }
  };

  const loadNextEvent = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      // Load Firestore events with retry logic
      let firestoreEvents = [];
      try {
        const eventsSnapshot = await retryFirestoreOperation(async () => {
          await firestore().enableNetwork();
          // Get events from 30 minutes ago to show recent past events too
          const thirtyMinutesAgo = new Date();
          thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
          const thirtyMinutesAgoTimestamp = firestore.Timestamp.fromDate(thirtyMinutesAgo);
          console.log('📅 Dashboard: Getting events from 30 minutes ago:', thirtyMinutesAgoTimestamp.toDate());
          return await firestore()
            .collection('events')
            .where('userId', '==', currentUser.uid)
            .where('startTime', '>=', thirtyMinutesAgoTimestamp)
            .orderBy('startTime')
            .limit(10)
            .get();
        });
        
        firestoreEvents = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isLocal: false,
        }));
        console.log('✅ Loaded', firestoreEvents.length, 'events from Firestore');
      } catch (firestoreError) {
        if (firestoreError.code === 'unavailable' || firestoreError.code === 'deadline-exceeded') {
          console.log('⚠️ Firestore temporarily unavailable for events:', firestoreError.message);
        } else {
          console.log('❌ Firestore events unavailable:', firestoreError);
        }
      }

      // Load local events
      let localEvents = [];
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const localEventsData = await AsyncStorage.getItem('localEvents');
             if (localEventsData) {
               const parsedLocalEvents = JSON.parse(localEventsData);
               // Filter events from 30 minutes ago
               const thirtyMinutesAgo = new Date();
               thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
               console.log('📅 Dashboard: Raw local events:', parsedLocalEvents.length);
               localEvents = parsedLocalEvents
                 .filter(event => new Date(event.startTime) >= thirtyMinutesAgo)
                 .map(event => ({
              ...event,
              startTime: { toDate: () => new Date(event.startTime) },
              endTime: { toDate: () => new Date(event.endTime) },
              isLocal: true,
            }));
        }
      } catch (localError) {
        console.log('Local events unavailable:', localError);
      }

      // Combine and sort all events, removing duplicates
      // Prioritize Firestore events over local events (by id, googleEventId, or title+time match)
      const allEventsMap = new Map();

      // First add Firestore events
      firestoreEvents.forEach(event => {
        // Use event ID as primary key, fallback to googleEventId or title+time
        const key = event.id || event.googleEventId || `${event.title}_${moment(event.startTime.toDate()).format('YYYY-MM-DD HH:mm')}`;
        allEventsMap.set(key, event);
      });

      // Then add local events only if they don't exist in Firestore
      localEvents.forEach(event => {
        // Use event ID as primary key, fallback to googleEventId or title+time
        const key = event.id || event.googleEventId || `${event.title}_${moment(event.startTime.toDate()).format('YYYY-MM-DD HH:mm')}`;
        if (!allEventsMap.has(key)) {
          allEventsMap.set(key, event);
        } else {
          console.log('📅 Dashboard: Skipping duplicate local event:', event.title);
        }
      });

      const allEvents = Array.from(allEventsMap.values()).sort((a, b) =>
        new Date(a.startTime.toDate()) - new Date(b.startTime.toDate())
      );

      // Debug all events and their statuses
      console.log('📍 All events loaded:');
      allEvents.forEach(e => {
        const eventTime = e.startTime.toDate ? e.startTime.toDate() : new Date(e.startTime);
        const isFuture = eventTime > now;
        console.log(`  - ${e.title}: status="${e.status}", startTime=${moment(eventTime).format('YYYY-MM-DD HH:mm')}, isFuture=${isFuture}, isLocal=${e.isLocal}`);
      });

      const now = new Date();
      const fiveSecondsAgo = new Date(now.getTime() - 5000); // 5 seconds ago

      // First, check for recently completed events (within last 5 seconds)
      const recentlyCompleted = allEvents.find(event =>
        event.status === 'completed' &&
        event.completedAt &&
        new Date(event.completedAt.toDate ? event.completedAt.toDate() : event.completedAt) >= fiveSecondsAgo
      );

      // If there's a recently completed event, show it briefly
      if (recentlyCompleted) {
        console.log('📍 Showing recently completed event:', recentlyCompleted.title);
        console.log('📍 Completed at:', new Date(recentlyCompleted.completedAt.toDate ? recentlyCompleted.completedAt.toDate() : recentlyCompleted.completedAt));
        setNextEvent(recentlyCompleted);

        // After 3 seconds, switch to next upcoming event
        setTimeout(() => {
          console.log('📍 Timeout triggered, switching to next event...');
          const upcomingEvents = allEvents.filter(event => {
            const isNotCompleted = event.status !== 'completed';
            const isFuture = new Date(event.startTime.toDate()) > now;
            console.log(`  - Checking ${event.title}: status="${event.status}", isNotCompleted=${isNotCompleted}, isFuture=${isFuture}`);
            return isNotCompleted && isFuture;
          });
          if (upcomingEvents.length > 0) {
            console.log('📍 Switching to next upcoming event:', upcomingEvents[0].title);
            setNextEvent(upcomingEvents[0]);
          } else {
            console.log('📍 No upcoming events, clearing card');
            setNextEvent(null);
          }
        }, 3000);
      } else {
        // Show next upcoming event (exclude completed events)
        const upcomingEvents = allEvents.filter(event => {
          const isNotCompleted = event.status !== 'completed';
          const isFuture = new Date(event.startTime.toDate()) > now;
          console.log(`  - Checking ${event.title}: status="${event.status}", isNotCompleted=${isNotCompleted}, isFuture=${isFuture}`);
          return isNotCompleted && isFuture;
        });

        if (upcomingEvents.length > 0) {
          console.log('📍 Showing next upcoming event:', upcomingEvents[0].title);
          setNextEvent(upcomingEvents[0]);
        } else {
          console.log('📍 No upcoming events');
          setNextEvent(null);
        }
      }

      // Schedule notifications for all upcoming events
      allEvents.forEach(event => {
        if (event.status === 'upcoming' || event.status !== 'completed') {
          NotificationService.scheduleEventNotifications(event).catch(err => {
            console.log('Failed to schedule notifications for event:', event.title, err);
          });
        }
      });

    } catch (error) {
      console.error('Error loading next event:', error);
      setNextEvent(null);
    }
  };

  const loadRecentEvents = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      // Load recent completed events from Firestore
      let completedEvents = [];
      try {
        await firestore().enableNetwork();

        // Try with orderBy first (requires index)
        try {
          const eventsSnapshot = await firestore()
            .collection('events')
            .where('userId', '==', currentUser.uid)
            .where('status', '==', 'completed')
            .orderBy('completedAt', 'desc')
            .limit(10)
            .get();

          completedEvents = eventsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Convert Firestore Timestamp to Date for completedAt
              completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt || Date.now()),
              isLocal: false,
            };
          });
          console.log('📊 Loaded', completedEvents.length, 'completed events from Firestore (with orderBy)');
        } catch (indexError) {
          // If orderBy fails (no index), get all completed events and sort client-side
          console.log('⚠️ Firestore orderBy failed, fetching without orderBy:', indexError.code);
          const eventsSnapshot = await firestore()
            .collection('events')
            .where('userId', '==', currentUser.uid)
            .where('status', '==', 'completed')
            .get();

          completedEvents = eventsSnapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt || Date.now()),
                isLocal: false,
              };
            })
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, 10);
          console.log('📊 Loaded', completedEvents.length, 'completed events from Firestore (client-side sort)');
        }
      } catch (firestoreError) {
        if (firestoreError.code === 'unavailable' || firestoreError.code === 'deadline-exceeded') {
          console.log('⚠️ Firestore temporarily unavailable for recent events:', firestoreError.message);
        } else {
          console.log('❌ Firestore completed events unavailable:', firestoreError);
        }
      }

      // Load recent completed events from local storage
      let localCompletedEvents = [];
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const localEventsData = await AsyncStorage.getItem('localEvents');
        if (localEventsData) {
          const parsedLocalEvents = JSON.parse(localEventsData);
          console.log('📊 Total local events:', parsedLocalEvents.length);
          const completedLocalEvents = parsedLocalEvents.filter(event => event.status === 'completed' && event.completedAt);
          console.log('📊 Completed local events:', completedLocalEvents.length);

          localCompletedEvents = completedLocalEvents
            .map(event => ({
              ...event,
              completedAt: new Date(event.completedAt),
              startTime: { toDate: () => new Date(event.startTime) },
              endTime: { toDate: () => new Date(event.endTime) },
              isLocal: true,
            }))
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, 10);
          console.log('📊 Processed', localCompletedEvents.length, 'local completed events');
        }
      } catch (localError) {
        console.log('Local completed events unavailable:', localError);
      }

      // Combine and set recent events
      const allRecentEvents = [...completedEvents, ...localCompletedEvents]
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, 5);

      setRecentEvents(allRecentEvents);
      console.log('📊 Loaded recent events:', allRecentEvents.length);
      allRecentEvents.forEach(event => console.log('  📊 Event:', event.title, 'Completed:', event.completedAt, 'On time:', event.arrivedOnTime));

    } catch (error) {
      console.error('Error loading recent events:', error);
      setRecentEvents([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserData(), 
      loadNextEvent(),
      loadRecentEvents(),
      syncCalendarData()
    ]);
    setRefreshing(false);
  };

  const handleSettingsClick = async () => {
    const newCount = settingsClickCount + 1;
    setSettingsClickCount(newCount);
    
    if (newCount === 50) {
      // Reset counter
      setSettingsClickCount(0);
      
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('phoneLockEnabled', 'false');
        Alert.alert(
          'Screen Lock Disabled', 
          'Phone lock feature has been disabled. You can re-enable it in Settings.',
          [{ text: 'OK', onPress: () => navigation.navigate('Settings') }]
        );
      } catch (error) {
        console.error('Error disabling phone lock:', error);
      }
      return; // Don't navigate immediately after 50 clicks
    } else if (newCount > 50) {
      setSettingsClickCount(0);
    }
    
    // Only navigate on single click (not during rapid clicking)
    if (newCount === 1) {
      setTimeout(() => {
        // Check if still at 1 click after delay (means single click, not rapid)
        if (settingsClickCount === 0) { // Will be 0 if no more clicks happened
          navigation.navigate('Settings');
        }
      }, 300);
    }
  };

  const handleTestEventCompletion = async () => {
    try {
      console.log('🧪 Testing event completion and points...');

      // Award test points
      const newPoints = await GamificationService.awardPoints(50, 'Test completion');

      // Create a test recent event
      const testEvent = {
        id: 'test_' + Date.now(),
        title: 'Test Event Completion',
        startTime: { toDate: () => new Date() },
        arrivedOnTime: true,
        completedAt: new Date().toISOString(),
      };

      // Add to recent events
      setRecentEvents(prev => [testEvent, ...prev.slice(0, 4)]);

      // Update stats
      setStats(prev => ({
        ...prev,
        points: newPoints,
      }));

      Alert.alert(
        '✅ Test Complete!',
        `Test event completed! You earned 50 XP points.\n\nTotal points: ${newPoints}`,
        [{ text: 'Awesome!' }]
      );

      console.log('✅ Test completed successfully');
    } catch (error) {
      console.error('❌ Test failed:', error);
      Alert.alert('Test Failed', 'Error during test: ' + error.message);
    }
  };

  const handleTestBadges = async () => {
    try {
      console.log('🎖️ Testing badge check...');

      // Check and award badges
      await GamificationService.checkAndAwardBadges();

      // Reload user data to show new badges
      await loadUserData();

      Alert.alert(
        '✅ Badge Check Complete!',
        'Badge checking logic has been triggered. Check your Profile to see if you earned any new badges!',
        [
          { text: 'View Profile', onPress: () => navigation.navigate('Profile') },
          { text: 'OK' }
        ]
      );

      console.log('✅ Badge check completed');
    } catch (error) {
      console.error('❌ Badge check failed:', error);
      Alert.alert('Badge Check Failed', 'Error: ' + error.message);
    }
  };

  const handleTestNotifications = async () => {
    console.log('🔔 ========== TEST NOTIFICATIONS BUTTON PRESSED ==========');
    try {
      console.log('🔔 Step 1: Starting notification system test...');

      // Ensure NotificationService is configured
      console.log('🔔 Step 2: Ensuring NotificationService is configured...');
      await NotificationService.ensureConfigured();
      console.log('🔔 Step 3: NotificationService configuration complete');

      // First, check if notifications are enabled
      console.log('🔔 Step 4: Checking notification permissions...');
      const hasPermissions = await NotificationService.checkPermissions();
      console.log('🔔 Step 5: Notification permissions result:', hasPermissions);

      if (!hasPermissions) {
        console.log('🔔 Permissions not granted, showing alert');
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in Settings to test.',
          [{ text: 'Open Settings', onPress: () => navigation.navigate('Settings') }]
        );
        return;
      }

      // Test immediate notification using require without .default
      console.log('🔔 Step 6: Loading PushNotification module...');
      const PushNotification = require('react-native-push-notification');
      console.log('🔔 Step 7: PushNotification module loaded:', typeof PushNotification);
      console.log('🔔 Step 8: Sending immediate notification...');

      PushNotification.localNotification({
        channelId: 'reminders',
        title: '🧪 Test Notification',
        message: 'This is a test notification! If you see this, notifications are working.',
        playSound: true,
        vibrate: true,
        userInfo: {
          type: 'test',
        },
      });
      console.log('🔔 Step 9: Immediate notification sent');

      // Also schedule one for 5 seconds from now
      console.log('🔔 Step 10: Scheduling notification for 5 seconds from now...');
      PushNotification.localNotificationSchedule({
        channelId: 'time-to-leave',
        title: '🧪 Scheduled Test',
        message: 'This notification was scheduled 5 seconds ago. Time-based notifications work!',
        date: new Date(Date.now() + 5000),
        allowWhileIdle: true,
        playSound: true,
        vibrate: true,
        userInfo: {
          type: 'test-scheduled',
        },
      });
      console.log('🔔 Step 11: Scheduled notification sent');

      console.log('🔔 Step 12: Showing success alert...');
      Alert.alert(
        '✅ Test Notifications Sent!',
        'Two test notifications have been sent:\n\n1. Immediate notification (should appear now)\n2. Scheduled notification (in 5 seconds)\n\nCheck your notification tray and the Notifications screen in the app.',
        [
          { text: 'View Notifications', onPress: () => navigation.navigate('Notifications') },
          { text: 'OK' }
        ]
      );

      console.log('✅ Test notifications completed successfully');
      console.log('🔔 ========================================================');
    } catch (error) {
      console.error('❌ Test notifications failed at some step');
      console.error('❌ Error details:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Test Failed', 'Error: ' + error.message);
      console.log('🔔 ========================================================');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Icon name="person" size={24} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
                {greeting}, {user?.displayName?.split(' ')[0] || 'Hero'}! 👋
              </Text>
              <Text style={styles.date}>
                {moment().format('dddd, MMMM D')}
              </Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={handleSettingsClick} 
              style={styles.headerButton}
            >
              <Icon name="settings" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.headerButton}
            >
              <Icon name="notifications" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
          />
        }
      >
        {nextEvent && (
          <NextEventCard
            event={nextEvent}
            onLeaveNow={() => navigation.navigate('PhoneLock', { event: nextEvent })}
            onCardPress={(event) => navigation.navigate('EditEvent', { event })}
            onStartJourney={(event) => navigation.navigate('JourneyOptions', { event })}
          />
        )}

        <StreakWidget
          streak={stats.currentStreak}
          xpEarned={50}
        />

        <QuickStats
          points={stats.points}
          badges={stats.badges}
          punctualityRate={stats.punctualityRate}
          onCardPress={() => navigation.navigate('Profile')}
        />

        {/* Connection Status */}
        {firestoreStatus === 'unavailable' && (
          <View style={styles.connectionStatus}>
            <Icon name="cloud-off" size={16} color="#ff6b6b" />
            <Text style={styles.connectionStatusText}>
              Working offline - some features may be limited
            </Text>
          </View>
        )}

        {/* Recent Activity Section */}
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentEvents.length > 0 ? (
            recentEvents.map((event, index) => (
              <View key={event.id || index} style={[
                styles.recentEventCard,
                { backgroundColor: event.arrivedOnTime === true ? '#e8f5e8' : '#fff3cd' }
              ]}>
                <View style={styles.recentEventHeader}>
                  <Text style={styles.recentEventTitle}>{event.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: event.arrivedOnTime === true ? '#28a745' : '#ffc107' }
                  ]}>
                    <Text style={styles.statusText}>
                      {event.arrivedOnTime === true ? '✅ On Time' : '⚠️ Late'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recentEventTime}>
                  {moment(event.startTime.toDate ? event.startTime.toDate() : event.startTime).format('MMM DD, HH:mm')}
                </Text>
                {event.arrivedOnTime === true && (
                  <Text style={styles.pointsEarned}>+50 XP earned!</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyRecentActivity}>
              <Text style={styles.emptyRecentText}>
                No recent events yet. Complete an event to see your activity here!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Calendar')}
            >
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                style={styles.actionGradient}
              >
                <Icon name="event" size={24} color="#fff" />
                <Text style={styles.actionText}>View Calendar</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddEvent')}
            >
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                style={styles.actionGradient}
              >
                <Icon name="add-circle" size={24} color="#fff" />
                <Text style={styles.actionText}>Add Event</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test Section */}
        <View style={styles.testSection}>
          <Text style={styles.testSectionTitle}>🧪 Testing Tools</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestEventCompletion}
          >
            <LinearGradient
              colors={['#ff9a9e', '#fecfef']}
              style={styles.testGradient}
            >
              <Icon name="star" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Test Points & Recent Activity</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, { marginTop: 10 }]}
            onPress={handleTestBadges}
          >
            <LinearGradient
              colors={['#a8edea', '#fed6e3']}
              style={styles.testGradient}
            >
              <Icon name="emoji-events" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Check for New Badges</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, { marginTop: 10 }]}
            onPress={handleTestNotifications}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.testGradient}
            >
              <Icon name="notifications-active" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Test Notifications</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 20,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  greetingContainer: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerButton: {
    padding: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    marginTop: -10,
    paddingBottom: 100, // Add extra padding to prevent cut-off
  },
  quickActions: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  actionGradient: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  testSection: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  testSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  testButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  testGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  recentActivity: {
    marginTop: 30,
    marginBottom: 20,
  },
  recentEventCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recentEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  recentEventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recentEventTime: {
    color: '#666',
    fontSize: 14,
    marginBottom: 5,
  },
  pointsEarned: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  connectionStatusText: {
    marginLeft: 8,
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyRecentActivity: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyRecentText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  activityText: {
    flex: 1,
    marginLeft: 10,
    color: '#333',
    fontSize: 14,
  },
  activityTime: {
    color: '#999',
    fontSize: 12,
  },
});

export default DashboardScreen;