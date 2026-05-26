import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  AppState,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import moment from 'moment-timezone';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoogleCalendarService from '../../services/GoogleCalendarService';
import GoogleMapsService from '../../services/GoogleMapsService';
import NotificationService from '../../services/NotificationService';
import LocationService from '../../services/LocationService';
import PushNotification from 'react-native-push-notification';

// Import all necessary theme components
import Theme, { 
  Colors, 
  Typography, 
  Spacing, 
  BorderRadius,
  CommonStyles,
  getTextShadow, 
  getSubtleTextShadow,
  getBackgroundImage,
  getFadeGradient,
  createGlassCard,
  getStatusColor,
  getGreeting,
} from '../../styles/theme';

const { width, height } = Dimensions.get('window');

const CalendarScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [nextEvent, setNextEvent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('Your Location');
  const [calculatedTravelTimes, setCalculatedTravelTimes] = useState({});
  const refreshIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // --- Design System Helpers ---
  const calendarGradient = ['#4c1d95', '#7c3aed', '#c4b5fd'];
  const headerTextShadow = getTextShadow();
  const cardTextShadow = getSubtleTextShadow();

  // Fetch current location and reverse geocode to address
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const hasPermission = await LocationService.requestLocationPermission();
        if (hasPermission) {
          const location = await LocationService.getCurrentLocation();

          if (location) {
            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=AIzaSyCjpfpg6D4w8nnW10Xkoz8DoWGS-0b6v6Q`
              );
              const data = await response.json();
              if (data.results && data.results[0]) {
                const address = data.results[0].formatted_address;
                const parts = address.split(',');
                const shortAddress = parts[0] + (parts[1] ? ', ' + parts[1].trim() : '');
                setCurrentAddress(shortAddress.length > 30 ? shortAddress.substring(0, 30) + '...' : shortAddress);
              }
            } catch (geocodeError) {
              console.log('Could not reverse geocode:', geocodeError);
            }
          }
        }
      } catch (error) {
        console.log('Could not get current location:', error);
      }
    };

    fetchLocation();
    const locationInterval = setInterval(fetchLocation, 30000);
    return () => clearInterval(locationInterval);
  }, []);

  // Calculate travel times for events with locations
  useEffect(() => {
    const calculateTravelTimes = async () => {
      if (events.length === 0) return;

      const travelTimesMap = {};

      for (const event of events) {
        if (!event.location || event.status === 'completed') continue;
        if (!event.location.trim() || event.location.length < 3) {
          console.log('⚠️ Skipping travel time calculation for event with invalid location:', event.title);
          continue;
        }

        try {
          const eventTime = event.startTime.toDate ? event.startTime.toDate() : event.startTime;
          const eventMoment = moment(eventTime);
          if (eventMoment.isBefore(moment().subtract(1, 'hour'))) {
            console.log('⚠️ Skipping travel time calculation for past event:', event.title);
            continue;
          }

          let travelInfo;
          if (event.origin && event.origin !== 'CURRENT_LOCATION') {
            travelInfo = await GoogleMapsService.calculateTravelTime(
              event.origin,
              event.location,
              eventTime
            );
          } else {
            travelInfo = await GoogleMapsService.calculateTravelTimeFromCurrentLocation(
              event.location,
              eventTime
            );
          }

          if (travelInfo && travelInfo.duration) {
            travelTimesMap[event.id] = travelInfo.duration;
            console.log('🚗 Calculated travel time for', event.title, ':', travelInfo.duration, 'min');
          }
        } catch (error) {
          console.log('Could not calculate travel time for', event.title, ':', error);
        }
      }

      setCalculatedTravelTimes(travelTimesMap);
    };

    calculateTravelTimes();
    const travelTimeInterval = setInterval(calculateTravelTimes, 300000);
    return () => clearInterval(travelTimeInterval);
  }, [events]);

  useEffect(() => {
    initializeCalendar();

    refreshIntervalRef.current = setInterval(() => {
      console.log('Auto-refreshing calendar...');
      loadEvents();
    }, 30000);

    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App came to foreground, refreshing calendar...');
        loadEvents();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('Calendar screen focused, refreshing events...');
      loadEvents();
    });

    const sub = DeviceEventEmitter.addListener('EVENT_ROUTE_UPDATED', (updatedEvent) => {
      setEvents(prev => prev.map(e => (e.id === updatedEvent.id ? { ...e, origin: updatedEvent.origin, location: updatedEvent.location } : e)));
      setTodayEvents(prev => prev.map(e => (e.id === updatedEvent.id ? { ...e, origin: updatedEvent.origin, location: updatedEvent.location } : e)));
      setNextEvent(prev => prev && prev.id === updatedEvent.id ? { ...prev, origin: updatedEvent.origin, location: updatedEvent.location } : prev);
    });

    const eventCompletedListener = DeviceEventEmitter.addListener('EVENT_COMPLETED', (completedEvent) => {
      console.log('📱 Calendar: Event completed:', completedEvent);
      
      // Update the events list
      setEvents(prev => prev.map(e => e.id === completedEvent.id ? completedEvent : e));
      
      // Update today's events
      setTodayEvents(prev => prev.map(e => e.id === completedEvent.id ? completedEvent : e));
      
      // If this was the next event, find the new next event
      if (nextEvent && nextEvent.id === completedEvent.id) {
        console.log('📱 Calendar: Next event completed, finding new next event');
        
        // Find the next upcoming event (not completed)
        const now = new Date();
        const nextUpcomingEvent = events.find(event => 
          event.id !== completedEvent.id && 
          event.status !== 'completed' && 
          new Date(event.startTime.toDate ? event.startTime.toDate() : event.startTime) > now
        );
        
        if (nextUpcomingEvent) {
          console.log('📱 Calendar: Setting next event to:', nextUpcomingEvent.title);
          setNextEvent(nextUpcomingEvent);
        } else {
          console.log('📱 Calendar: No more upcoming events');
          setNextEvent(null);
        }
      }
    });

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      subscription?.remove();
      unsubscribeFocus();
      sub.remove();
      eventCompletedListener.remove();
    };
  }, []);

  const initializeCalendar = async () => {
    await loadEvents();
    await syncCalendarData();
  };

  const syncCalendarData = async () => {
    try {
      console.log('Starting calendar sync on calendar screen load...');
      await GoogleCalendarService.syncCalendarEvents();
      console.log('Calendar sync completed, reloading events...');
      await loadEvents();
    } catch (error) {
      console.error('Error syncing calendar on calendar screen load:', error);
    }
  };

  const loadEvents = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      let localEvents = [];
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const localEventsData = await AsyncStorage.getItem('localEvents');
        if (localEventsData) {
          const parsedLocalEvents = JSON.parse(localEventsData);
          const oneHourAgo = new Date();
          oneHourAgo.setHours(oneHourAgo.getHours() - 1);
          console.log('📅 Raw local events:', parsedLocalEvents.length);
          localEvents = parsedLocalEvents
            .filter(event => new Date(event.startTime) >= oneHourAgo)
            .map(event => ({
              ...event,
              startTime: { toDate: () => new Date(event.startTime) },
              endTime: { toDate: () => new Date(event.endTime) },
              isLocal: true,
            }));
          console.log('📅 Processed local events (from 1 hour ago):', localEvents.length);
        }
      } catch (localError) {
        console.log('Local events unavailable:', localError);
      }

      let firestoreEvents = [];
      try {
        await firestore().enableNetwork();
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        const oneHourAgoTimestamp = firestore.Timestamp.fromDate(oneHourAgo);
        console.log('📅 Calendar: Getting events from 1 hour ago:', oneHourAgoTimestamp.toDate());
        const eventsSnapshot = await firestore()
          .collection('events')
          .where('userId', '==', currentUser.uid)
          .where('startTime', '>=', oneHourAgoTimestamp)
          .orderBy('startTime')
          .get();
        
        firestoreEvents = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isLocal: false,
        }));
        console.log('📅 Loaded', firestoreEvents.length, 'events from Firestore in CalendarScreen');
      } catch (firestoreError) {
        console.log('⚠️ Firestore events unavailable in CalendarScreen:', firestoreError);
      }

      const allEventsMap = new Map();
      firestoreEvents.forEach(event => {
        const eventTime = moment(event.startTime.toDate()).format('YYYY-MM-DD HH:mm');
        const key = `${event.title}_${eventTime}_${event.location || ''}`;
        allEventsMap.set(key, event);
      });

      localEvents.forEach(event => {
        const eventTime = moment(event.startTime.toDate()).format('YYYY-MM-DD HH:mm');
        const key = `${event.title}_${eventTime}_${event.location || ''}`;
        if (!allEventsMap.has(key)) {
          allEventsMap.set(key, event);
        }
      });

      const allEvents = Array.from(allEventsMap.values()).sort((a, b) =>
        new Date(a.startTime.toDate()) - new Date(b.startTime.toDate())
      );

      setEvents(allEvents);
      console.log('📅 Setting events state to:', allEvents.length, 'events');

      // Emit event status updates for events that are in "danger" status (LEAVE NOW)
      allEvents.forEach(event => {
        const status = getEventStatus(event);
        if (status === 'danger') {
          console.log('📱 Calendar: Emitting danger event status update:', event.title);
          DeviceEventEmitter.emit('EVENT_STATUS_UPDATED', {
            ...event,
            status: 'time-to-leave' // Convert to time-to-leave for dashboard compatibility
          });
        }
      });

      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');
      const filteredTodayEvents = allEvents.filter(event => {
        if (event.status === 'completed') return false;
        const eventTime = moment(event.startTime.toDate());
        return eventTime.isBetween(todayStart, todayEnd, null, '[]');
      });
      setTodayEvents(filteredTodayEvents);

      // Find next event - prioritize events in "time-to-leave" status
      const nextEventData = allEvents.find(event => {
        const status = getEventStatus(event);
        return event.status !== 'completed' && status === 'danger';
      }) || allEvents.find(event =>
        event.status !== 'completed' && moment(event.startTime.toDate()).isAfter(moment())
      );
      setNextEvent(nextEventData);

      // Schedule notifications for events that haven't been scheduled recently
      const now = moment();
      for (const event of allEvents) {
        // Schedule notifications for upcoming events and events that haven't started yet
        const eventTime = moment(event.startTime.toDate ? event.startTime.toDate() : event.startTime);
        const isEventUpcoming = eventTime.isAfter(now);
        
        if (event.status === 'upcoming' || (isEventUpcoming && !event.status) || getEventStatus(event) === 'danger') {
          try {
            // Check if notifications were already scheduled recently (within last 5 minutes)
            const scheduledKey = `notifications_scheduled_${event.id}`;
            const lastScheduled = await AsyncStorage.getItem(scheduledKey);
            const shouldSchedule = !lastScheduled || 
              moment(lastScheduled).isBefore(now.subtract(5, 'minutes'));
            
            if (shouldSchedule) {
              await NotificationService.scheduleEventNotifications(event);
              console.log(`✅ Scheduled notifications for: ${event.title}`);
            } else {
              console.log(`⏭️ Skipping notification scheduling for ${event.title} (already scheduled recently)`);
            }
          } catch (err) {
            console.log('Failed to schedule notifications for event:', event.title, err);
          }
        } else if (eventTime.isBefore(now) && eventTime.isAfter(now.subtract(1, 'hour'))) {
          // For events that just passed (within the last hour), show a missed notification
          try {
            const missedKey = `missed_notification_${event.id}`;
            const alreadyNotified = await AsyncStorage.getItem(missedKey);
            
            if (!alreadyNotified) {
              // Show immediate notification for missed event
              PushNotification.localNotification({
                channelId: 'reminders',
                title: '⏰ Event Missed',
                message: `You missed "${event.title}" which was scheduled for ${eventTime.format('h:mm A')}`,
                playSound: true,
                soundName: 'default',
                vibrate: true,
                importance: 4,
                smallIcon: 'ic_launcher',
                userInfo: {
                  eventId: event.id,
                  type: 'missed',
                  eventTitle: event.title,
                },
              });
              
              // Mark as notified
              await AsyncStorage.setItem(missedKey, new Date().toISOString());
              console.log(`✅ Sent missed notification for: ${event.title}`);
            }
          } catch (err) {
            console.log('Failed to send missed notification for event:', event.title, err);
          }
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncing(true);
    try {
      await reAuthenticateGoogle();
      await GoogleCalendarService.syncCalendarEvents();
      await syncLocalEventsToGoogle();
      await loadEvents();
      Alert.alert('Success', 'Calendar synced successfully!');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Failed', 'Please check your Google Calendar connection');
    } finally {
      setIsSyncing(false);
    }
  };

  const reAuthenticateGoogle = async () => {
    try {
      Alert.alert(
        'Re-authenticate Google',
        'This will sign you out and back in with new calendar permissions to enable event creation.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              try {
                const { GoogleSignin } = require('@react-native-google-signin/google-signin');
                await GoogleSignin.signOut();
                console.log('Signed out from Google');
                await GoogleSignin.hasPlayServices();
                const { idToken } = await GoogleSignin.signIn();
                const googleCredential = auth.GoogleAuthProvider.credential(idToken);
                await auth().signInWithCredential(googleCredential);
                console.log('Re-authenticated with Google Calendar write permissions');
                Alert.alert('Success', 'Re-authentication completed! You can now create events in Google Calendar.');
              } catch (error) {
                console.error('Re-authentication failed:', error);
                Alert.alert('Error', 'Re-authentication failed. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Re-authentication failed:', error);
      Alert.alert('Error', 'Re-authentication failed. Please try again.');
    }
  };

  const syncLocalEventsToGoogle = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const localEventsData = await AsyncStorage.getItem('localEvents');
      if (!localEventsData) return;
      
      const localEvents = JSON.parse(localEventsData);
      const unsyncedEvents = localEvents.filter(event => !event.syncedToGoogle);
      if (unsyncedEvents.length === 0) return;

      console.log(`Syncing ${unsyncedEvents.length} local events to Google Calendar...`);
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (!isSignedIn) return;

      const calendarService = require('../../services/GoogleCalendarService').default;
      const tokens = await calendarService.getTokensSafely();
      const accessToken = tokens.accessToken;
      if (!accessToken) return;

      for (const event of unsyncedEvents) {
        try {
          const startDateTime = new Date(event.startTime);
          const endDateTime = new Date(event.endTime);

          const googleEvent = {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: {
              dateTime: moment(startDateTime).format('YYYY-MM-DDTHH:mm:ss'),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: moment(endDateTime).format('YYYY-MM-DDTHH:mm:ss'),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 30 },
                { method: 'popup', minutes: 10 },
              ],
            },
          };

          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(googleEvent),
            }
          );

          if (response.ok) {
            const createdEvent = await response.json();
            console.log('Event synced to Google Calendar:', createdEvent.id);
            const updatedEvents = localEvents.map(e => 
              e.id === event.id 
                ? { ...e, googleEventId: createdEvent.id, syncedToGoogle: true }
                : e
            );
            await AsyncStorage.setItem('localEvents', JSON.stringify(updatedEvents));
          }
        } catch (error) {
          console.error('Error syncing individual event:', error);
        }
      }
    } catch (error) {
      console.error('Error syncing local events to Google Calendar:', error);
    }
  };

  const handleStartLockMode = (event) => {
    // Don't allow lock mode for completed events
    if (event.status === 'completed') {
      Alert.alert(
        'Event Completed',
        'This event has already been completed.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const now = moment();
    let eventTime;
    if (event.timezone) {
      eventTime = moment(event.startTime.toDate()).tz(event.timezone);
    } else {
      eventTime = moment(event.startTime.toDate());
    }
    const travelTime = calculatedTravelTimes[event.id] || event.travelTime || 15;
    const departureTime = eventTime.clone().subtract(travelTime, 'minutes');
    
    if (now.isAfter(departureTime)) {
      Alert.alert(
        'Time to Leave!',
        `It's time to go to "${event.title}"! Starting lock mode to help you stay focused.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Lock Phone',
            onPress: () => {
              navigation.navigate('PhoneLock', { event });
            },
          },
        ]
      );
    } else {
      const timeUntilDeparture = moment.duration(departureTime.diff(now));
      Alert.alert(
        'Departure Reminder Set',
        `You'll be reminded to leave in ${timeUntilDeparture.hours()}h ${timeUntilDeparture.minutes()}m for "${event.title}"`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteEvent = (event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      console.log('Canceling notifications for event:', eventToDelete.id);
      NotificationService.cancelEventNotifications(eventToDelete.id);
      
      if (eventToDelete.isLocal) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const localEventsData = await AsyncStorage.getItem('localEvents');
        if (localEventsData) {
          const events = JSON.parse(localEventsData);
          const filteredEvents = events.filter(e => e.id !== eventToDelete.id);
          await AsyncStorage.setItem('localEvents', JSON.stringify(filteredEvents));
        }

        if (eventToDelete.googleEventId) {
          try {
            await deleteFromGoogleCalendar(eventToDelete.googleEventId);
          } catch (error) {
            console.log('Google Calendar deletion failed (may already be deleted):', error.message);
          }
        }
      } else {
        await firestore().collection('events').doc(eventToDelete.id).delete();
        if (eventToDelete.googleEventId) {
          try {
            await deleteFromGoogleCalendar(eventToDelete.googleEventId);
          } catch (error) {
            console.log('Google Calendar deletion failed (may already be deleted):', error.message);
          }
        }
      }

      await loadEvents();
      Alert.alert('Success', 'Event deleted successfully!');
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event');
    } finally {
      setShowDeleteModal(false);
      setEventToDelete(null);
    }
  };

  const deleteFromGoogleCalendar = async (googleEventId) => {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (!isSignedIn) return;

      const calendarService = require('../../services/GoogleCalendarService').default;
      const tokens = await calendarService.getTokensSafely();
      const accessToken = tokens.accessToken;
      if (!accessToken) return;

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        console.log('Event deleted from Google Calendar');
      } else if (response.status === 410) {
        console.log('Event already deleted from Google Calendar (410 - Gone)');
      } else {
        console.error('Failed to delete from Google Calendar:', response.status);
        throw new Error(`Failed to delete from Google Calendar: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting from Google Calendar:', error);
    }
  };

  const getEventStatus = (event) => {
    if (event.status === 'completed') {
      return 'success'; // Always show green for completed events
    }

    const now = moment();
    let eventTime;
    if (event.timezone) {
      eventTime = moment(event.startTime.toDate()).tz(event.timezone);
    } else {
      eventTime = moment(event.startTime.toDate());
    }
    const travelTime = calculatedTravelTimes[event.id] || event.travelTime || 15;
    const departureTime = eventTime.clone().subtract(travelTime, 'minutes');

    if (now.isAfter(eventTime)) return 'neutral';
    if (now.isAfter(departureTime)) return 'danger'; // Keep original 'danger' status for red colors
    return 'info';
  };
  
  const getEventIcon = (status) => {
    const iconMap = {
        success: 'check-circle',
        warning: 'schedule',
        danger: 'directions-run',
        info: 'schedule',
        neutral: 'event',
    };
    return iconMap[status] || 'event';
  };

  const getEventLabel = (event, status) => {
    if (event.status === 'completed') return event.arrivedOnTime ? 'Completed ✓' : 'Late Arrival';
    if (status === 'danger') return 'LEAVE NOW';
    if (status === 'info') return 'UPCOMING';
    return 'Event';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadEvents(), syncCalendarData()]);
    setRefreshing(false);
  };

  const renderEventCard = (event, isNextEvent = false) => {
    const themeStatus = getEventStatus(event);
    const statusColor = getStatusColor(themeStatus);
    const eventIcon = getEventIcon(themeStatus);
    const eventLabel = getEventLabel(event, themeStatus);
    const cardStyle = createGlassCard('lightGray', isNextEvent ? 'large' : 'medium');
    
    // Use dark text for neutral/light status colors, white for others
    const statusTextColor = themeStatus === 'neutral' ? '#000000' : '#FFFFFF';

    let eventTime;
    try {
      eventTime = moment(event.startTime.toDate()).local();
    } catch (error) {
      eventTime = moment().local();
    }
    const travelTime = calculatedTravelTimes[event.id] || event.travelTime || 15;
    const departureTime = eventTime.clone().subtract(travelTime, 'minutes');
    const isLeaveNow = themeStatus === 'danger';

    return (
      <View key={event.id} style={[styles.eventCardWrapper, { marginBottom: Spacing.base }]}>
        <View style={cardStyle}>
          <View style={CommonStyles.rowBetween}>
            <View style={CommonStyles.row}>
              <Icon name="schedule" size={Typography.size.lg} color={Colors.text.primary} />
              <Text style={[Typography.body, cardTextShadow, { marginLeft: Spacing.sm }]}>
                {eventTime.format('MMM D, h:mm A')}
              </Text>
              {event.isLocal && (
                <View style={[styles.localBadge, { backgroundColor: Colors.glass.light, borderColor: Colors.glass.border }]}>
                  <Text style={[Typography.small, cardTextShadow, { color: Colors.text.primary }]}>
                    {event.syncedToGoogle ? 'Synced' : 'Local'}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Icon name={eventIcon} size={Typography.size.sm} color={statusTextColor} />
              <Text style={[Typography.small, { fontWeight: Typography.weight.bold, marginLeft: Spacing.xs, color: statusTextColor }]}>
                {eventLabel}
              </Text>
            </View>
          </View>
          
          <Text style={[Typography.h4, cardTextShadow, { marginVertical: Spacing.sm }]}>{event.title}</Text>

          {event.location && (
            <View style={[styles.journeyInfoContainer, { borderColor: statusColor + '30' }]}>
              <View style={[CommonStyles.rowBetween, { marginBottom: Spacing.xs }]}>
                <View style={styles.journeyPoint}>
                  <Icon name="my-location" size={Typography.size.base} color={Colors.status.success.solid} />
                  <Text style={[Typography.caption, styles.textHint, { marginLeft: Spacing.xs }]} numberOfLines={1}>
                    From: {event.origin && event.origin !== 'CURRENT_LOCATION' ? event.origin : currentAddress}
                  </Text>
                </View>
                <Icon name="arrow-right-alt" size={Typography.size.lg} color={Colors.text.tertiary} />
                <View style={styles.journeyPoint}>
                  <Icon name="place" size={Typography.size.base} color={Colors.status.danger.solid} />
                  <Text style={[Typography.caption, styles.textHint, { marginLeft: Spacing.xs }]} numberOfLines={1}>
                    To: {event.location}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.travelTimeChip, { backgroundColor: statusColor }]}>
                <Icon name={event.transportationMode === 'walking' ? 'directions-walk' : 
                          event.transportationMode === 'bicycling' ? 'directions-bike' :
                          event.transportationMode === 'transit' ? 'directions-transit' : 'directions-car'} 
                      size={Typography.size.sm} color={Colors.text.primary} />
                <Text style={[Typography.small, cardTextShadow, { marginLeft: Spacing.xs }]}>
                  {travelTime} min {event.transportationMode || 'travel'}
                </Text>
              </View>
            </View>
          )}

          {themeStatus !== 'neutral' && (
            <View style={[CommonStyles.rowBetween, { marginTop: Spacing.sm }]}>
              <View style={CommonStyles.row}>
                <Icon name="departure-board" size={Typography.size.base} color={isLeaveNow ? Colors.status.danger.solid : Colors.status.info.solid} />
                <Text style={[Typography.body, cardTextShadow, { marginLeft: Spacing.xs, fontWeight: Typography.weight.semibold }]}>
                  {isLeaveNow ? 'LEAVE NOW!' : `Depart: ${departureTime.format('h:mm A')}`}
                </Text>
              </View>
              
              {isLeaveNow ? (
                <TouchableOpacity
                  style={[styles.lockButtonContainer, { backgroundColor: Colors.status.danger.solid }]}
                  onPress={() => handleStartLockMode(event)}
                >
                  <Icon name="lock" size={Typography.size.base} color={Colors.text.primary} />
                  <Text style={[Typography.caption, styles.lockButtonText]}>Lock Mode</Text>
                </TouchableOpacity>
              ) : (
                <View style={CommonStyles.row}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: Colors.glass.light }]}
                    onPress={() => navigation.navigate('EditEvent', { event })}
                  >
                    <Icon name="edit" size={Typography.size.base} color={Colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: Colors.status.danger.glass, marginLeft: Spacing.sm }]}
                    onPress={() => handleDeleteEvent(event)}
                  >
                    <Icon name="delete" size={Typography.size.base} color={Colors.status.danger.solid} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={CommonStyles.container}>
      <LinearGradient
        colors={calendarGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientOverlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={Colors.text.primary}
              colors={[Colors.text.primary]}
            />
          }
        >
          <View style={styles.header}>
            <Text style={[Typography.h1, headerTextShadow, {marginBottom: Spacing.md}]}>
              📅 Your Calendar
            </Text>
            
            <View style={CommonStyles.rowBetween}>
                <View style={CommonStyles.row}>
                    <TouchableOpacity
                        style={[styles.syncButton, createGlassCard('neutral', 'small'), {paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, marginRight: Spacing.md}]}
                        onPress={reAuthenticateGoogle}
                    >
                        <Icon name="account-circle" size={Typography.size.md} color={Colors.text.primary} />
                        <Text style={[Typography.caption, cardTextShadow, { marginLeft: Spacing.xs }]}>Re-Auth</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.syncButton, createGlassCard('info', 'small'), {paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm}]}
                        onPress={handleSyncCalendar}
                        disabled={isSyncing}
                    >
                        <Icon 
                          name="sync" 
                          size={Typography.size.md} 
                          color={Colors.text.primary} 
                          style={isSyncing && styles.spinning}
                        />
                        <Text style={[Typography.caption, cardTextShadow, { marginLeft: Spacing.xs }]}>
                          {isSyncing ? 'Syncing...' : 'Sync'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
          </View>

          {nextEvent && (
            <View style={styles.section}>
              <Text style={[Typography.h4, styles.sectionTitle]}>🎯 Next Event</Text>
              {renderEventCard(nextEvent, true)}
            </View>
          )}

          {todayEvents.length > 0 && (
            <View style={styles.section}>
              <Text style={[Typography.h4, styles.sectionTitle]}>📋 Today's Events</Text>
              {todayEvents
                .filter(event => !nextEvent || event.id !== nextEvent.id)
                .map(event => renderEventCard(event))}
            </View>
          )}

          {events.length > 0 && (
            <View style={[styles.section, { marginBottom: Spacing.huge }]}>
              <Text style={[Typography.h4, styles.sectionTitle]}>🔮 Upcoming Events</Text>
              {events
                .filter(event => getEventStatus(event) === 'info')
                .filter(event => !nextEvent || event.id !== nextEvent.id)
                .slice(0, 5)
                .map(event => renderEventCard(event))}
            </View>
          )}

          {events.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="event-busy" size={60} color={Colors.text.hint} style={{marginBottom: Spacing.lg}} />
              <Text style={[Typography.h3, cardTextShadow, {marginBottom: Spacing.sm}]}>No Events Found</Text>
              <Text style={[Typography.body, styles.textHint, {textAlign: 'center', marginBottom: Spacing.xl}]}>
                Sync your Google Calendar to see your upcoming events
              </Text>
              <TouchableOpacity
                style={[styles.syncButton, createGlassCard('info', 'medium'), {width: '80%', justifyContent: 'center'}]}
                onPress={handleSyncCalendar}
              >
                <Icon name="sync" size={Typography.size.lg} color={Colors.text.primary} />
                <Text style={[Typography.body, cardTextShadow, { marginLeft: Spacing.base }]}>Sync Calendar</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, CommonStyles.glassCardLarge]}>
              <Text style={[Typography.h4, styles.modalTitle, cardTextShadow]}>⚠️ Delete Event</Text>
              <Text style={[Typography.body, styles.modalMessage, styles.textSecondary]}>
                Are you sure you want to delete <Text style={{fontWeight: Typography.weight.bold}}>{eventToDelete?.title}</Text>? This action cannot be undone.
              </Text>
              <View style={CommonStyles.rowBetween}>
                <TouchableOpacity
                  style={[styles.modalButton, createGlassCard('neutral', 'small'), {flex: 1, marginRight: Spacing.sm}]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={[Typography.body, cardTextShadow, {color: Colors.text.primary}]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, createGlassCard('danger', 'small'), {flex: 1, marginLeft: Spacing.sm}]}
                  onPress={confirmDeleteEvent}
                >
                  <Text style={[Typography.body, cardTextShadow, {color: Colors.text.primary}]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  gradientOverlay: {
    flex: 1,
  },
  scrollContent: {
    ...CommonStyles.scrollContent,
    paddingTop: Spacing.xl,
  },
  
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    marginBottom: Spacing.base,
    color: Colors.text.primary,
    ...getTextShadow(),
  },

  eventCardWrapper: {},
  statusBadge: {
    ...CommonStyles.row,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  localBadge: {
    ...CommonStyles.row,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
    marginLeft: Spacing.sm,
  },
  
  journeyInfoContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.glass.clear,
    borderWidth: 1,
  },
  journeyPoint: {
    ...CommonStyles.row,
    width: '45%',
  },
  travelTimeChip: {
    ...CommonStyles.row,
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },

  lockButtonContainer: {
    ...CommonStyles.row,
    padding: Spacing.sm,
    borderRadius: BorderRadius.base,
  },
  lockButtonText: {
    ...getSubtleTextShadow(),
    marginLeft: Spacing.sm,
    fontWeight: Typography.weight.bold,
  },
  actionButton: {
    ...CommonStyles.row,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },

  emptyState: {
    ...CommonStyles.rowCenter,
    flexDirection: 'column',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    textAlign: 'center',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  modalMessage: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  modalButton: {
    ...CommonStyles.rowCenter,
    borderWidth: 1.5,
  },

  syncButton: {
    ...CommonStyles.row,
  },
  spinning: {},
  textHint: {
    color: Colors.text.hint,
  },
  textSecondary: {
    color: Colors.text.secondary,
  },
});

export default CalendarScreen;
