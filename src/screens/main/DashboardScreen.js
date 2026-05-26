import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WalkthroughOverlay, { WALKTHROUGH_KEY } from '../../components/WalkthroughOverlay';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  StatusBar,
  Dimensions,
  DeviceEventEmitter,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import moment from 'moment';
import GoogleCalendarService from '../../services/GoogleCalendarService';
import LocationService from '../../services/LocationService';
import GoogleMapsService from '../../services/GoogleMapsService';
import GamificationService from '../../services/GamificationService';
import Theme, {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  CommonStyles,
  getDynamicBackground,
  getBackgroundImage,
  getFadeGradient,
  getGreeting,
  getTimeOfDay,
  formatTime,
  formatDate,
  getSubtleTextShadow,
  getStrongTextShadow,
  getTextShadow,
  createGlassCard,
  getStatusColor,
  getAdaptiveGlassColors,
} from '../../styles/theme';

const { height } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [nextEvent, setNextEvent] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [stats, setStats] = useState({
    points: 0,
    currentStreak: 0,
    punctualityRate: 0,
    level: 1,
    xpForNextLevel: 100,
  });
  const [events, setEvents] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('Getting location...');
  const [userName, setUserName] = useState('User');
  const [notificationCount, setNotificationCount] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const backgroundImage = getBackgroundImage();
  const fadeColors = getFadeGradient();
  const greeting = getGreeting();
  const timeOfDay = getTimeOfDay();
  const adaptiveGlass = getAdaptiveGlassColors();
  const adaptiveStyles = createAdaptiveStyles(adaptiveGlass);

  // Load user data
  const loadUserData = async () => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      setUserName(displayName);
    }
  };

  // Load user stats from GamificationService
  const loadUserStats = async () => {
    try {
      const userStats = await GamificationService.getUserStats();
      
      if (userStats) {
        console.log('📊 User stats loaded:', userStats);
        
        setStats(prevStats => ({
          ...prevStats,
          points: userStats.xp,
          level: userStats.level,
          currentStreak: userStats.currentStreak,
          xpForNextLevel: userStats.xpForNextLevel,
        }));
        
        console.log('📊 User stats updated in state:', {
          points: userStats.xp,
          level: userStats.level,
          currentStreak: userStats.currentStreak,
          xpForNextLevel: userStats.xpForNextLevel,
        });
      } else {
        console.log('❌ No user stats found, setting defaults');
        setStats(prevStats => ({
          ...prevStats,
          points: 0,
          level: 1,
          currentStreak: 0,
          xpForNextLevel: 100,
        }));
      }
    } catch (error) {
      console.error('❌ Error loading user stats:', error);
    }
  };

  // Load notification count
  const loadNotificationCount = async () => {
    try {
      const notifications = await AsyncStorage.getItem('userNotifications');
      if (notifications) {
        const parsedNotifications = JSON.parse(notifications);
        const unreadCount = parsedNotifications.filter(n => !n.read).length;
        setNotificationCount(unreadCount);
        console.log('📱 Dashboard: Loaded notification count:', unreadCount);
      }
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  // Load current location and then events
  useEffect(() => {
    console.log('🚀 Dashboard: useEffect triggered - initializing dashboard');
    const initialize = async () => {
      console.log('🚀 Dashboard: Starting initialization');
      await loadUserData();
      await loadUserStats();
      await loadNotificationCount();
      const location = await getCurrentLocation();
      console.log('🚀 Dashboard: Location obtained, loading events');
      await loadEvents(location);
      console.log('🚀 Dashboard: Events loaded, initialization complete');

      // Show walkthrough on first launch
      const walkthroughDone = await AsyncStorage.getItem(WALKTHROUGH_KEY);
      if (!walkthroughDone) {
        setShowWalkthrough(true);
      }
    };
    initialize();
  }, []);

  // Listen for TIME_TO_LEAVE events to update dashboard and navigate to lock screen
  useEffect(() => {
    const timeToLeaveListener = DeviceEventEmitter.addListener('TIME_TO_LEAVE', (data) => {
      console.log('🚨 Dashboard: TIME_TO_LEAVE event received:', data);
      
      // Update the next event status to show "time to leave"
      if (nextEvent && nextEvent.id === data.eventId) {
        // Don't trigger lock screen if event is already completed
        if (nextEvent.status === 'completed') {
          console.log('🚨 Dashboard: Event already completed, skipping lock screen');
          return;
        }
        
        setNextEvent(prev => ({
          ...prev,
          status: 'time-to-leave'
        }));
        console.log('🚨 Dashboard: Updated next event status to time-to-leave');
        
        // Navigate to lock screen
        console.log('🚨 Dashboard: Navigating to PhoneLock screen');
        navigation.navigate('PhoneLock', { eventId: nextEvent.id });
      }
    });

    return () => {
      timeToLeaveListener.remove();
    };
  }, [nextEvent, navigation]);

  // Listen for stats reset events
  useEffect(() => {
    console.log('🎧 Dashboard: Setting up event listeners...');
    
    
    const statsResetListener = DeviceEventEmitter.addListener('STATS_RESET', () => {
      console.log('🔄 Dashboard: Stats reset event received, reloading user stats');
      console.log('🔄 Current stats before reset:', stats);
      
      // Immediately set stats to reset values
      const resetStats = {
        points: 0,
        level: 1,
        currentStreak: 0,
        xpForNextLevel: 100,
      };
      console.log('🔄 Dashboard: Immediately setting stats to reset values:', resetStats);
      setStats(prevStats => {
        const updatedStats = {
          ...prevStats,
          ...resetStats,
        };
        console.log('🔄 Dashboard: Stats updated from', prevStats, 'to', updatedStats);
        return updatedStats;
      });
      
      // Then reload from Firestore
      loadUserStats();
      
      // Force a re-render by updating a dummy state
      setForceUpdate(prev => prev + 1);
    });

    const forceRefreshListener = DeviceEventEmitter.addListener('FORCE_REFRESH', () => {
      console.log('🔄 Dashboard: Force refresh event received');
      onRefresh();
    });

    const pointsUpdateListener = DeviceEventEmitter.addListener('POINTS_UPDATED', (data) => {
      console.log('🎯 Dashboard: Points updated event received:', data);
      console.log('🎯 Dashboard: Event data type:', typeof data);
      console.log('🎯 Dashboard: Event data keys:', data ? Object.keys(data) : 'null');
      
      const newStats = {
        points: data.points || 0,
        level: data.level || 1,
        currentStreak: data.currentStreak || 0,
        xpForNextLevel: data.xpForNextLevel || (data.level * 100 - data.points) || 100,
      };
      console.log('🎯 Dashboard: Setting stats to:', newStats);
      setStats(prevStats => {
        const updatedStats = {
          ...prevStats,
          ...newStats,
        };
        console.log('🎯 Dashboard: Stats updated from', prevStats, 'to', updatedStats);
        return updatedStats;
      });
      
      // Force a re-render
      setForceUpdate(prev => prev + 1);
    });

    const achievementListener = DeviceEventEmitter.addListener('ACHIEVEMENT_EARNED', (achievement) => {
      console.log('🏆 Dashboard: Achievement earned:', achievement);
      // Show achievement popup
      showAchievementPopup(achievement);
    });

    const levelUpListener = DeviceEventEmitter.addListener('LEVEL_UP', (data) => {
      console.log('🎉 Dashboard: Level up event received:', data);
      showLevelUpPopup(data);
    });

    const completeResetListener = DeviceEventEmitter.addListener('COMPLETE_RESET', (data) => {
      console.log('🔄 Dashboard: Complete reset event received:', data);
      const resetStats = {
        points: data.points || 0,
        level: data.level || 1,
        currentStreak: data.currentStreak || 0,
        xpForNextLevel: data.xpForNextLevel || 100,
      };
      console.log('🔄 Dashboard: Setting complete reset stats:', resetStats);
      setStats(prevStats => {
        const updatedStats = {
          ...prevStats,
          ...resetStats,
        };
        console.log('🔄 Dashboard: Complete reset stats updated from', prevStats, 'to', updatedStats);
        return updatedStats;
      });
      
      // Force a re-render
      setForceUpdate(prev => prev + 1);
    });


    return () => {
      statsResetListener.remove();
      forceRefreshListener.remove();
      pointsUpdateListener.remove();
      achievementListener.remove();
      levelUpListener.remove();
      completeResetListener.remove();
    };
  }, []); // Remove stats dependency to prevent multiple listeners

  // Timer to check if it's time to leave for the next event
  useEffect(() => {
    if (!nextEvent || nextEvent.status === 'completed') return;

    const updateEventStatus = () => {
      const eventDate = getEventDate(nextEvent.startTime);
      if (!eventDate) return;
      
      const eventTime = moment(eventDate);
      const actualTravelTime = nextEvent.travelTime || 15;
      const leaveTime = eventTime.clone().subtract(actualTravelTime, 'minutes');
      const now = moment();
      const diff = leaveTime.diff(now, 'minutes');

      console.log('⏰ Dashboard timer check:', {
        event: nextEvent.title,
        eventTime: eventTime.format('HH:mm'),
        leaveTime: leaveTime.format('HH:mm'),
        minutesUntilLeave: diff,
        currentTime: now.format('HH:mm'),
        currentStatus: nextEvent.status
      });

      // Update status based on time remaining
      if (diff <= 0) {
        // It's time to leave now
        if (nextEvent.status !== 'time-to-leave') {
          console.log('🔴 Dashboard: Time to leave NOW! Updating status');
          setNextEvent(prev => ({
            ...prev,
            status: 'time-to-leave'
          }));
          
        // Navigate to lock screen
        console.log('🚨 Dashboard: Auto-navigating to PhoneLock screen');
        navigation.navigate('PhoneLock', { eventId: nextEvent.id });
        }
      } else if (diff <= 5) {
        // Within 5 minutes - show warning
        if (nextEvent.status === 'upcoming') {
          console.log('🟡 Dashboard: Within 5 minutes, updating to warning status');
          setNextEvent(prev => ({
            ...prev,
            status: 'warning'
          }));
        }
      }
    };

    // Check immediately
    updateEventStatus();

    // Set up interval to check every 10 seconds for more responsive updates
    const interval = setInterval(updateEventStatus, 10000);

    return () => clearInterval(interval);
  }, [nextEvent, navigation]);

  // Listen for notification updates
  useEffect(() => {
    const notificationReceivedListener = DeviceEventEmitter.addListener('NOTIFICATION_RECEIVED', () => {
      console.log('📱 Dashboard: Notification received, updating count');
      loadNotificationCount();
    });

    const notificationClearedListener = DeviceEventEmitter.addListener('NOTIFICATIONS_CLEARED', () => {
      console.log('📱 Dashboard: Notifications cleared, updating count');
      loadNotificationCount();
    });

    const notificationReadListener = DeviceEventEmitter.addListener('NOTIFICATION_READ', () => {
      console.log('📱 Dashboard: Notification marked as read, updating count');
      loadNotificationCount();
    });

    return () => {
      notificationReceivedListener.remove();
      notificationClearedListener.remove();
      notificationReadListener.remove();
    };
  }, []);

  // Listen for event status updates from calendar screen
  useEffect(() => {
    const eventStatusUpdateListener = DeviceEventEmitter.addListener('EVENT_STATUS_UPDATED', (updatedEvent) => {
      console.log('📱 Dashboard: Event status updated:', updatedEvent);
      
      // Update the events list
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      
      // If this event is now in "time-to-leave" status, make it the next event
      if (updatedEvent.status === 'time-to-leave') {
        console.log('📱 Dashboard: Making time-to-leave event the next event');
        setNextEvent(updatedEvent);
      }
      // If this is the current next event and status changed, update it
      else if (nextEvent && nextEvent.id === updatedEvent.id) {
        setNextEvent(updatedEvent);
      }
    });

    return () => {
      eventStatusUpdateListener.remove();
    };
  }, [nextEvent]);

  // Listen for event completion
  useEffect(() => {
    const eventCompletedListener = DeviceEventEmitter.addListener('EVENT_COMPLETED', (completedEvent) => {
      console.log('📱 Dashboard: Event completed:', completedEvent);
      
      // Update the events list
      setEvents(prev => prev.map(e => e.id === completedEvent.id ? completedEvent : e));
      
      // If this was the current next event, show completed status for 1 minute
      if (nextEvent && nextEvent.id === completedEvent.id) {
        console.log('📱 Dashboard: Current event completed, showing completed status');
        
        // Show completed event with green status
        setNextEvent({
          ...completedEvent,
          status: 'completed',
          showCompleted: true
        });
        
        // After 1 minute, find the next upcoming event
        setTimeout(() => {
          console.log('📱 Dashboard: 1 minute passed, finding next event');
          
          const now = new Date();
          const nextUpcomingEvent = events.find(event => {
            const eventDate = getEventDate(event.startTime);
            return event.id !== completedEvent.id && 
                   event.status !== 'completed' && 
                   eventDate && eventDate > now;
          });
          
          if (nextUpcomingEvent) {
            console.log('📱 Dashboard: Setting next event to:', nextUpcomingEvent.title);
            setNextEvent(nextUpcomingEvent);
          } else {
            console.log('📱 Dashboard: No more upcoming events');
            setNextEvent(null);
          }
        }, 60000); // 1 minute = 60,000ms
      }
    });

    return () => {
      eventCompletedListener.remove();
    };
  }, [nextEvent, events]);

  // Listen for route updates
  useEffect(() => {
    const routeUpdateListener = DeviceEventEmitter.addListener('EVENT_ROUTE_UPDATED', (updatedEvent) => {
      console.log('📱 Dashboard: Route updated:', updatedEvent);
      
      // Only proceed if the updated event has a valid startTime
      if (!updatedEvent.startTime) {
        console.log('⚠️ Dashboard: Skipping route update - event has no startTime');
        return;
      }
      
      // Update the events list
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e));
      
      // If this is the current next event, update it immediately
      if (nextEvent && nextEvent.id === updatedEvent.id) {
        console.log('📱 Dashboard: Updating current next event with new route data');
        setNextEvent(prev => ({ ...prev, ...updatedEvent }));
      }
    });

    return () => {
      routeUpdateListener.remove();
    };
  }, [nextEvent]);

  // Helper function to safely get Date object from startTime
  const getEventDate = (startTime) => {
    if (!startTime) return null;
    
    try {
      if (startTime.toDate && typeof startTime.toDate === 'function') {
        return startTime.toDate();
      } else if (startTime instanceof Date) {
        return startTime;
      } else if (typeof startTime === 'string' || typeof startTime === 'number') {
        return new Date(startTime);
      }
      return null;
    } catch (error) {
      console.error('Error converting startTime to Date:', error);
      return null;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        // Reverse geocode to get address
        const address = await GoogleMapsService.reverseGeocode(location.latitude, location.longitude);
        if (address) {
          setCurrentLocationName(address);
        } else {
          setCurrentLocationName(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
        }
        return location;
      }
      return null;
    } catch (error) {
      console.error('Error getting current location:', error);
      setCurrentLocationName('Current Location');
      return null;
    }
  };

  const loadEvents = async (location = null) => {
    try {
      // Use passed location or current state
      const loc = location || currentLocation;
      
      console.log('📊 Dashboard loadEvents called with location:', loc ? `${loc.latitude},${loc.longitude}` : 'null');
      
      // Load events from Firestore - recent events for display, all events for stats
      const currentUser = auth().currentUser;
      if (!currentUser) return;
      
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const oneHourAgoTimestamp = firestore.Timestamp.fromDate(oneHourAgo);
      
      // Load recent events for display (same as calendar)
      const recentEventsSnapshot = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .where('startTime', '>=', oneHourAgoTimestamp)
        .orderBy('startTime')
        .get();
        
      const eventsData = recentEventsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: getEventDate(data.startTime) || new Date()
        };
      });

      // Load all events for stats calculation (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoTimestamp = firestore.Timestamp.fromDate(thirtyDaysAgo);
      
      const allEventsSnapshot = await firestore()
        .collection('events')
        .where('userId', '==', currentUser.uid)
        .where('startTime', '>=', thirtyDaysAgoTimestamp)
        .orderBy('startTime')
        .get();
        
      const allEventsData = allEventsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: getEventDate(data.startTime) || new Date()
        };
      });

      setEvents(eventsData);
      
      // Find next upcoming event - prioritize events in "time-to-leave" status
      const now = new Date();
      let upcomingEvent = eventsData.find(event => event.status === 'time-to-leave') || 
                         eventsData.find(event => event.startTime > now);
      
      console.log('📅 Dashboard next event:', upcomingEvent ? `${upcomingEvent.title} (origin: ${upcomingEvent.origin}, travelTime: ${upcomingEvent.travelTime})` : 'none');
      
      // Recalculate travel time for the next event to ensure accuracy
      if (upcomingEvent && upcomingEvent.location && loc) {
        try {
          console.log(`🗺️ Dashboard: Recalculating travel time for ${upcomingEvent.title}`);
          
          let travelData;
          if (upcomingEvent.origin && upcomingEvent.origin !== 'CURRENT_LOCATION') {
            travelData = await GoogleMapsService.calculateTravelTime(
              upcomingEvent.origin,
              upcomingEvent.location,
              upcomingEvent.startTime
            );
          } else {
            travelData = await GoogleMapsService.calculateTravelTimeFromCurrentLocation(
              upcomingEvent.location,
              upcomingEvent.startTime
            );
          }
          
          console.log('🗺️ Dashboard: Travel data received:', travelData);
          if (travelData && travelData.duration) {
            console.log(`✅ Dashboard: Updated travel time from ${upcomingEvent.travelTime} to ${travelData.duration} minutes`);
            upcomingEvent = {
              ...upcomingEvent,
              travelTime: travelData.duration
            };
          }
        } catch (error) {
          console.error('❌ Dashboard: Error calculating travel time for next event:', error);
        }
      } else {
        console.log('⚠️ Dashboard: Skipping travel time recalculation:', {
          hasEvent: !!upcomingEvent,
          hasLocation: !!upcomingEvent?.location,
          hasCurrentLocation: !!loc
        });
      }
      
      console.log('📅 Dashboard: Setting next event with travelTime:', upcomingEvent?.travelTime);
      console.log('📅 Dashboard: Next event details:', {
        title: upcomingEvent?.title,
        location: upcomingEvent?.location,
        startTime: upcomingEvent?.startTime,
        travelTime: upcomingEvent?.travelTime,
        status: upcomingEvent?.status
      });
      setNextEvent(upcomingEvent || null);

      // Get recent events (past 7 days) from all events for stats
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentEventsData = allEventsData
        .filter(event => event.startTime >= weekAgo && event.startTime < now)
        .slice(-5) // Last 5 events
        .map(event => {
          // Determine status based on event data
          let status = 'success'; // Default
          let points = 50; // Default points
          
          if (event.status === 'completed') {
            if (event.arrivedOnTime === true) {
              status = 'success';
              points = 50;
            } else if (event.arrivedOnTime === false) {
              status = 'warning';
              points = 10;
            }
          } else if (event.arrivedOnTime === true || event.wasEarly === true) {
            status = 'success';
            points = event.wasEarly ? 100 : 50;
          } else if (event.arrivedOnTime === false) {
            status = 'warning';
            points = 10;
          }
          
          return {
            id: event.id,
            title: event.title,
            status: status,
            time: formatTime(event.startTime),
            points: points,
            arrivedOnTime: event.arrivedOnTime,
            wasEarly: event.wasEarly,
          };
        });
      
      setRecentEvents(recentEventsData);

      // Calculate stats from all events (last 30 days)
      const totalEvents = allEventsData.length;
      // Count events with successful status (onTime, success, completed)
      const onTimeEvents = allEventsData.filter(event => 
        event.status === 'success' || 
        event.status === 'onTime' || 
        event.status === 'completed' ||
        event.arrivedOnTime === true ||
        event.arrivedEarly === true
      ).length;
      const punctualityRate = totalEvents > 0 ? Math.round((onTimeEvents / totalEvents) * 100) : 0;
      
      setStats(prevStats => ({
        ...prevStats,
        punctualityRate,
        currentStreak: 12, // This would need to be calculated based on actual data
        points: totalEvents * 50, // This would need to be calculated based on actual data
      }));

    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const location = await getCurrentLocation();
    await loadUserStats(); // Reload user stats
    await loadEvents(location);
    setRefreshing(false);
  };

  // Show achievement popup
  const showAchievementPopup = (achievement) => {
    Alert.alert(
      '🏆 Achievement Unlocked!',
      `${achievement.title}\n\n${achievement.description}\n\n+${achievement.xpReward} XP`,
      [{ text: 'Awesome!', style: 'default' }]
    );
  };

  // Show level up popup
  const showLevelUpPopup = (data) => {
    Alert.alert(
      '🎉 Level Up!',
      `Congratulations! You've reached Level ${data.level}!\n\nYou now have ${data.xp} XP!`,
      [{ text: 'Amazing!', style: 'default' }]
    );
  };

  const getEventStatusStyle = (status) => {
    const statusMap = {
      success: 'success',
      onTime: 'success',
      warning: 'warning',
      late: 'warning',
      danger: 'danger',
      missed: 'danger',
      'time-to-leave': 'danger', // Red card for time to leave
      upcoming: 'info',
    };
    return statusMap[status] || 'neutral';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background: Photo at top, seamless fade to gradient */}
      <ImageBackground
        source={{ uri: backgroundImage }}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        {/* Smooth fade overlay extending beyond image for seamless blend */}
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0)',      // Fully transparent at top
            'rgba(0, 0, 0, 0)',      // Keep transparent for first 60% 
            'rgba(0, 0, 0, 0.3)',    // Start fading
            'rgba(0, 0, 0, 0.8)',    // More opaque
            '#000',                   // Solid black at bottom
          ]}
          locations={[0, 0.6, 0.75, 0.9, 1]} // Control where each color appears
          style={styles.imageFadeOverlay}
        />
        <LinearGradient
          colors={fadeColors}
          locations={fadeColors.map((_, index) => index / (fadeColors.length - 1))}
          style={styles.gradientOverlay}
        >
      <ScrollView
            style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
                tintColor={Colors.text.primary}
              />
            }
          >
            {/* Header - Simple text over photo */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <TouchableOpacity 
                  style={styles.notificationBell}
                  onPress={() => navigation.navigate('Notifications')}
                  activeOpacity={0.7}
                >
                  <Icon name="notifications" size={24} color="#fff" />
                  {notificationCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationCount}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.headerContent}>
                <Text style={[Typography.caption, styles.timeOfDay, getTextShadow()]}>
                  {timeOfDay.toUpperCase()}
                </Text>
                <Text style={[Typography.h2, styles.greeting, getTextShadow()]}>
                  {greeting}, {userName}
                </Text>
                <Text style={[Typography.caption, styles.date, getSubtleTextShadow()]}>
                  {formatDate(new Date())}
                </Text>
              </View>
            </View>

            {/* Main Stat - Glass card with punctuality */}
            <View style={[createGlassCard('success', 'large'), styles.mainStatCard]}>
              <Text style={[Typography.giant, styles.mainStat, getTextShadow()]}>
                {stats.punctualityRate}%
              </Text>
              <Text style={[Typography.body, { color: Colors.text.secondary }]}>
                On Time Rate
              </Text>
            </View>

            {/* Next Event - Status-based glass card */}
            {nextEvent && nextEvent.startTime ? (
              <TouchableOpacity 
                style={[
                  createGlassCard(getEventStatusStyle(nextEvent.status), 'large'),
                  styles.nextEventCard
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  // Convert Date objects to strings to avoid navigation serialization warning
                  const serializableEvent = {
                    ...nextEvent,
                    startTime: (() => {
                      const eventDate = getEventDate(nextEvent.startTime);
                      return eventDate ? eventDate.toISOString() : new Date().toISOString();
                    })()
                  };
                  navigation.navigate('EditEvent', { event: serializableEvent });
                }}
              >
                <View style={styles.eventTimeRow}>
                  <Text style={[Typography.massive, getTextShadow()]}>
                    {(() => {
                      const eventDate = getEventDate(nextEvent.startTime);
                      return eventDate ? formatTime(eventDate) : 'N/A';
                    })()}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(nextEvent.status) }]}>
                    <Text style={[Typography.small, { fontWeight: '600', color: '#FFFFFF' }]}>
                      {nextEvent.status === 'time-to-leave' ? 'LEAVE NOW' : 
                       nextEvent.status === 'completed' ? 'COMPLETED' : 'UPCOMING'}
                    </Text>
                  </View>
                </View>
                
                <Text style={[Typography.h3, styles.eventTitle, getSubtleTextShadow()]}>
                  {nextEvent.title}
                </Text>
                
                {/* Event Date */}
                <View style={styles.dateRow}>
                  <Icon name="event" size={18} color={Colors.text.secondary} />
                  <Text style={[Typography.body, { color: Colors.text.secondary, marginLeft: 6 }]}>
                    {(() => {
                      const eventDate = getEventDate(nextEvent.startTime);
                      return eventDate ? formatDate(eventDate) : 'N/A';
                    })()}
                  </Text>
                </View>
                
                <View style={styles.locationRow}>
                  <Icon name="place" size={18} color={Colors.text.secondary} />
                  <Text style={[Typography.body, { color: Colors.text.secondary, marginLeft: 6 }]}>
                    {nextEvent.location}
            </Text>
          </View>

                {/* From/To Route Information */}
                <View style={styles.routeInfo}>
                  <View style={styles.routeRow}>
                    <Icon name="my-location" size={16} color={Colors.status.success.solid} />
                    <Text style={[Typography.caption, { color: Colors.text.secondary, marginLeft: 6, flex: 1 }]}>
                      From: {nextEvent.origin === 'CURRENT_LOCATION' ? currentLocationName : (nextEvent.origin || currentLocationName)}
                    </Text>
                  </View>
                  <View style={styles.routeRow}>
                    <Icon name="place" size={16} color={Colors.status.info.solid} />
                    <Text style={[Typography.caption, { color: Colors.text.secondary, marginLeft: 6, flex: 1 }]}>
                      To: {nextEvent.location}
                    </Text>
                </View>
                  <View style={styles.routeRow}>
                    <Icon name="access-time" size={16} color={Colors.status.warning.solid} />
                    <Text style={[Typography.caption, { color: Colors.text.secondary, marginLeft: 6 }]}>
                      ETA: {(() => {
                        const eventDate = getEventDate(nextEvent.startTime);
                        return eventDate ? formatTime(eventDate) : 'N/A';
                      })()}
                </Text>
              </View>
                  <View style={styles.routeRow}>
                    <Icon name={nextEvent.transportationMode === 'walking' ? 'directions-walk' : 
                              nextEvent.transportationMode === 'bicycling' ? 'directions-bike' :
                              nextEvent.transportationMode === 'transit' ? 'directions-transit' : 'directions-car'} 
                          size={16} color={Colors.status.info.solid} />
                    <Text style={[Typography.caption, { color: Colors.text.secondary, marginLeft: 6 }]}>
                      Travel Time: {nextEvent.travelTime || 15} min {nextEvent.transportationMode ? `(${nextEvent.transportationMode})` : ''}
                </Text>
              </View>
                </View>

                {/* Departure and Get Ready Times */}
                <View style={styles.timingInfo}>
                  <View style={styles.timingRow}>
                    <Icon name="schedule" size={16} color={Colors.status.warning.solid} />
                    <Text style={[Typography.caption, { color: Colors.text.secondary, marginLeft: 6 }]}>
                      Get Ready: {(() => {
                        const eventDate = getEventDate(nextEvent.startTime);
                        return eventDate ? formatTime(new Date(eventDate.getTime() - (nextEvent.travelTime || 30) * 60000 - 30 * 60000)) : 'N/A';
                      })()}
              </Text>
            </View>
                  <View style={styles.timingRow}>
                    <Icon name="directions" size={16} color={Colors.status.info.solid} />
                    <Text style={[Typography.caption, { color: Colors.text.secondary, marginLeft: 6 }]}>
                      Depart: {(() => {
                        const eventDate = getEventDate(nextEvent.startTime);
                        return eventDate ? formatTime(new Date(eventDate.getTime() - (nextEvent.travelTime || 30) * 60000)) : 'N/A';
                      })()}
                    </Text>
                  </View>
        </View>

                <TouchableOpacity 
                  style={styles.startRouteButton}
                  onPress={() => {
                    // Convert Date objects to strings to avoid navigation serialization warning
                    const serializableEvent = {
                      ...nextEvent,
                      startTime: (() => {
                        const eventDate = getEventDate(nextEvent.startTime);
                        return eventDate ? eventDate.toISOString() : new Date().toISOString();
                      })()
                    };
                    navigation.navigate('JourneyOptions', { event: serializableEvent });
                  }}
                >
                  <Icon name="navigation" size={20} color={Colors.text.primary} />
                  <Text style={[Typography.body, { marginLeft: 8, fontWeight: '600' }]}>
                    Start Navigation
                  </Text>
                </TouchableOpacity>

                {/* Leave Now Button - only show for time-to-leave events */}
                {nextEvent.status === 'time-to-leave' && (
                  <TouchableOpacity 
                    style={[styles.startRouteButton, { backgroundColor: Colors.status.danger.solid, marginTop: Spacing.sm }]}
                    onPress={() => {
                      navigation.navigate('PhoneLock', { eventId: nextEvent.id });
                    }}
                  >
                    <Icon name="directions-run" size={20} color="#FFFFFF" />
                    <Text style={[Typography.body, { marginLeft: 8, fontWeight: '600', color: '#FFFFFF' }]}>
                      Leave Now
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[createGlassCard('info', 'large'), styles.nextEventCard]}>
                <View style={{ alignItems: 'center' }}>
                  <Icon name="event" size={48} color={Colors.text.secondary} />
                  <Text style={[Typography.h3, { color: Colors.text.secondary, marginTop: Spacing.md, textAlign: 'center' }]}>
                    No Upcoming Events
                  </Text>
            <TouchableOpacity
                    style={styles.startRouteButton}
              onPress={() => navigation.navigate('AddEvent')}
            >
                    <Icon name="add" size={20} color={Colors.text.primary} />
                    <Text style={[Typography.body, { marginLeft: 8, fontWeight: '600' }]}>
                      Add Your First Event
                    </Text>
            </TouchableOpacity>
          </View>
        </View>
            )}

            {/* Quick Stats - Glass cards in row */}
            <View style={styles.statsRow}>
              <View style={[adaptiveStyles.adaptiveGlassCard, styles.statCard]}>
                <Icon name="local-fire-department" size={28} color={Colors.status.warning.solid} />
                <Text style={[Typography.h2, styles.statValue, getSubtleTextShadow()]}>
                  {stats.currentStreak}
                </Text>
                <Text style={[Typography.caption, styles.statLabel]}>
                  Day Streak
                </Text>
              </View>

              <View style={[adaptiveStyles.adaptiveGlassCard, styles.statCard]}>
                <Icon name="stars" size={28} color={Colors.accent.gold} />
                <Text style={[Typography.h2, styles.statValue, getSubtleTextShadow()]}>
                  {stats.points}
                </Text>
                <Text style={[Typography.caption, styles.statLabel]}>
                  Total Points
                </Text>
                <Text style={[Typography.small, { color: Colors.text.tertiary, marginTop: 2 }]}>
                  {stats.xpForNextLevel} to next level
                </Text>
              </View>

              <View style={[adaptiveStyles.adaptiveGlassCard, styles.statCard]}>
                <Icon name="emoji-events" size={28} color={Colors.status.info.solid} />
                <Text style={[Typography.h2, styles.statValue, getSubtleTextShadow()]}>
                  {stats.level}
                </Text>
                <Text style={[Typography.caption, styles.statLabel]}>
                  Level
                </Text>
              </View>
            </View>

            {/* Quick Actions - Glass card */}
            <View style={[adaptiveStyles.adaptiveGlassCard, styles.quickActionsCard]}>
              <View style={styles.actionsRow}>
          <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('AddEvent')}
                >
                  <Icon name="add-circle-outline" size={32} color={Colors.text.primary} />
                  <Text style={[Typography.caption, styles.actionText, getSubtleTextShadow()]}>
                    Add Event
                  </Text>
          </TouchableOpacity>

          <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Calendar')}
                >
                  <Icon name="calendar-today" size={32} color={Colors.text.primary} />
                  <Text style={[Typography.caption, styles.actionText, getSubtleTextShadow()]}>
                    Calendar
                  </Text>
          </TouchableOpacity>

          <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Icon name="emoji-events" size={32} color={Colors.text.primary} />
                  <Text style={[Typography.caption, styles.actionText, getSubtleTextShadow()]}>
                    Achievements
                  </Text>
          </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onRefresh}
        >
          <Icon name="refresh" size={32} color={Colors.text.primary} />
          <Text style={[Typography.caption, styles.actionText, getSubtleTextShadow()]}>
            Refresh
          </Text>
        </TouchableOpacity>

              </View>
            </View>

            {/* Recent Activity - Glass cards with status colors */}
            <View style={styles.recentSection}>
              <Text style={[Typography.h4, styles.sectionTitle, getSubtleTextShadow()]}>
                Recent Activity
              </Text>
              
              {recentEvents.length > 0 ? (
                recentEvents.map((event) => (
                  <View 
                    key={event.id}
                    style={[
                      createGlassCard(event.status),
                      styles.activityCard
                    ]}
                  >
                    <Icon 
                      name={event.status === 'success' ? 'check-circle' : 'warning'}
                      size={24} 
                      color={getStatusColor(event.status)}
                      style={styles.activityIcon}
                    />
                    <View style={styles.activityContent}>
                      <Text style={[Typography.body, { color: Colors.text.primary }]}>
                        {event.status === 'success' 
                          ? (event.wasEarly ? 'Arrived early to ' : 'Arrived on time to ')
                          : 'Arrived late to '}
                        {event.title}
                      </Text>
                      <Text style={[Typography.small, { color: Colors.text.tertiary, marginTop: 4 }]}>
                        {event.time} • {event.points > 0 ? '+' : ''}{event.points} points
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={[createGlassCard('neutral'), styles.activityCard]}>
                  <Icon 
                    name="history"
                    size={24} 
                    color={Colors.text.tertiary}
                    style={styles.activityIcon}
                  />
                  <View style={styles.activityContent}>
                    <Text style={[Typography.body, { color: Colors.text.secondary }]}>
                      No recent activity
                    </Text>
                    <Text style={[Typography.small, { color: Colors.text.tertiary, marginTop: 4 }]}>
                      Your event history will appear here
                    </Text>
                  </View>
                </View>
              )}
        </View>

      </ScrollView>
        </LinearGradient>
      </ImageBackground>

      {showWalkthrough && (
        <WalkthroughOverlay onComplete={() => setShowWalkthrough(false)} />
      )}
    </View>
  );
};

// Helper function to create adaptive glass card styles
const createAdaptiveStyles = (adaptiveGlass) => StyleSheet.create({
  adaptiveGlassCard: {
    backgroundColor: adaptiveGlass.medium,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: adaptiveGlass.border,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    height: height * 0.5, // Photo visible in top 50%
    resizeMode: 'cover',
    opacity: 0.9, // Slight transparency for better blend
  },
  imageFadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5, // Same height as the image
  },
  gradientOverlay: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },

  // Header
  header: {
    marginBottom: Spacing.xxxl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerContent: {
    // Content block for greeting and date
  },
  timeOfDay: {
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    letterSpacing: 2,
  },
  greeting: {
    marginBottom: Spacing.xs,
  },
  date: {
    color: Colors.text.tertiary,
  },
  notificationBell: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Main Stat Card
  mainStatCard: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  mainStat: {
    marginBottom: Spacing.xs,
  },

  // Next Event Card
  nextEventCard: {
    marginBottom: Spacing.xl,
  },
  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  eventTitle: {
    marginBottom: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  routeInfo: {
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  timingInfo: {
    marginBottom: Spacing.lg,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  startRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.base,
    marginTop: Spacing.sm,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    color: Colors.text.tertiary,
    textAlign: 'center',
  },

  // Quick Actions
  quickActionsCard: {
    marginBottom: Spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    marginTop: Spacing.sm,
    color: Colors.text.primary,
  },

  // Recent Activity
  recentSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
    letterSpacing: 0.5,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  activityIcon: {
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
});

export default DashboardScreen;