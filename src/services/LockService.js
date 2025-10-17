import { NativeModules, DeviceEventEmitter, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';

class LockService {
  constructor() {
    this.isLocked = false;
    this.lockTimer = null;
    this.currentEvent = null;
    this.appStateSubscription = null;
  }

  async startLockMode(event, onUnlock) {
    try {
      const lockDuration = await AsyncStorage.getItem('lockDuration');
      const defaultLockDuration = lockDuration ? parseInt(lockDuration) : 30; // minutes
      
      this.isLocked = true;
      this.currentEvent = event;
      this.onUnlockCallback = onUnlock;

      // Store lock state
      await AsyncStorage.setItem('lockMode', JSON.stringify({
        isLocked: true,
        eventId: event.id,
        startTime: new Date().toISOString(),
        lockDuration: defaultLockDuration,
      }));

      // Start location tracking
      this.startLocationTracking();

      // Monitor app state
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange
      );

      // Set timer for auto-unlock at event start time
      const eventTime = new Date(event.startTime.toDate());
      const now = new Date();
      const timeUntilEvent = eventTime - now;

      if (timeUntilEvent > 0) {
        this.lockTimer = setTimeout(() => {
          this.unlock('Event started');
        }, timeUntilEvent);
      }

      // Block app switching (platform specific implementation needed)
      this.blockAppSwitching();
      
      console.log(`Phone locked for ${defaultLockDuration} minutes before event`);
    } catch (error) {
      console.error('Error starting lock mode:', error);
    }
  }

  handleAppStateChange = (nextAppState) => {
    if (this.isLocked && nextAppState === 'background') {
      // Force app to foreground (platform specific)
      // This requires native module implementation
      this.forceToForeground();
    }
  };

  startLocationTracking() {
    // Track location to detect arrival
    this.locationWatchId = Geolocation.watchPosition(
      (position) => {
        this.checkArrival(position);
      },
      (error) => {
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
      }
    );
  }

  checkArrival(position) {
    if (!this.currentEvent?.location) return;

    // In production, use Google Maps API to get actual coordinates
    // For demo, use simple distance check
    const eventLocation = this.getEventCoordinates(this.currentEvent.location);
    
    if (eventLocation) {
      const distance = this.calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        eventLocation.lat,
        eventLocation.lng
      );

      // If within 50 meters of event location
      if (distance < 50) {
        this.unlock('Arrived at location');
      }
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  getEventCoordinates(location) {
    // Mock coordinates - in production, use Geocoding API
    const mockLocations = {
      'Conference Room B': { lat: 37.7749, lng: -122.4194 },
      'Office': { lat: 37.7751, lng: -122.4196 },
      // Add more locations
    };

    return mockLocations[location] || null;
  }

  blockAppSwitching() {
    // Platform specific implementation
    // On Android: Use accessibility service or device admin
    // On iOS: Use guided access mode or screen time API
    
    // For demo purposes, we'll use a simple approach
    // that shows a persistent notification
    this.showLockNotification();
  }

  showLockNotification() {
    // Show persistent notification that returns to app when tapped
    // Implementation depends on notification service
  }

  forceToForeground() {
    // Native module implementation needed
    // This is platform specific and requires special permissions
  }

  unlock(reason) {
    this.isLocked = false;

    // Clear lock state
    AsyncStorage.removeItem('lockMode');

    // Stop location tracking
    if (this.locationWatchId) {
      Geolocation.clearWatch(this.locationWatchId);
    }

    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Clear timers
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
    }

    // Call unlock callback
    if (this.onUnlockCallback) {
      this.onUnlockCallback(reason);
    }

    // Update event status
    if (this.currentEvent) {
      // Check if arrived on time
      const eventTime = new Date(this.currentEvent.startTime.toDate ? this.currentEvent.startTime.toDate() : this.currentEvent.startTime);
      const now = new Date();
      const isOnTime = now <= eventTime; // Arrived before or at event time

      console.log('🎯 Unlock reason:', reason);
      console.log('🎯 Event time:', eventTime);
      console.log('🎯 Current time:', now);
      console.log('🎯 Is on time:', isOnTime);

      this.updateEventCompletion(isOnTime);
    }
  }

  async unlockAsync(reason) {
    this.isLocked = false;

    // Clear lock state
    await AsyncStorage.removeItem('lockMode');

    // Stop location tracking
    if (this.locationWatchId) {
      Geolocation.clearWatch(this.locationWatchId);
    }

    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Clear timers
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
    }

    // Update event status and WAIT for it to complete
    if (this.currentEvent) {
      // Check if arrived on time
      const eventTime = new Date(this.currentEvent.startTime.toDate ? this.currentEvent.startTime.toDate() : this.currentEvent.startTime);
      const now = new Date();
      const isOnTime = now <= eventTime; // Arrived before or at event time

      console.log('🎯 Async unlock - Unlock reason:', reason);
      console.log('🎯 Event time:', eventTime);
      console.log('🎯 Current time:', now);
      console.log('🎯 Is on time:', isOnTime);

      // Wait for event update to complete
      await this.updateEventCompletion(isOnTime);
      console.log('✅ Event completion update finished');
    }
  }

  async updateEventCompletion(arrivedOnTime) {
    if (!this.currentEvent) return;

    try {
      console.log('🎯 Updating event completion for:', this.currentEvent.title);
      console.log('🎯 Arrived on time:', arrivedOnTime);

      // Import services
      const firestore = require('@react-native-firebase/firestore').default;
      const GamificationService = require('./GamificationService').default;
      const NotificationService = require('./NotificationService').default;

      const completedAt = new Date();
      const eventTime = new Date(this.currentEvent.startTime.toDate ? this.currentEvent.startTime.toDate() : this.currentEvent.startTime);

      // Check if arrived 10+ minutes early for Early Bird badge
      const minutesEarly = (eventTime - completedAt) / (1000 * 60);
      const wasEarly = minutesEarly >= 10;

      console.log('🎯 Minutes before event:', minutesEarly);
      console.log('🎯 Was early (10+ min):', wasEarly);

      // Update event status in Firestore
      if (!this.currentEvent.isLocal) {
        await firestore().collection('events').doc(this.currentEvent.id).update({
          status: 'completed',
          completedAt: firestore.Timestamp.fromDate(completedAt),
          arrivedOnTime: arrivedOnTime,
          wasEarly: wasEarly,
        });
        console.log('✅ Event status updated in Firestore:', {
          id: this.currentEvent.id,
          status: 'completed',
          completedAt: completedAt.toISOString(),
          arrivedOnTime,
          wasEarly,
        });
      } else {
        // For local events, also update in Firestore if possible
        try {
          const auth = require('@react-native-firebase/auth').default;
          const currentUser = auth().currentUser;

          // Try to create the event in Firestore if it doesn't exist yet
          const eventTime = new Date(this.currentEvent.startTime.toDate ? this.currentEvent.startTime.toDate() : this.currentEvent.startTime);
          const minutesEarly = (eventTime - completedAt) / (1000 * 60);
          const wasEarly = minutesEarly >= 10;

          const eventData = {
            userId: currentUser.uid,
            title: this.currentEvent.title,
            description: this.currentEvent.description || '',
            location: this.currentEvent.location || '',
            startTime: firestore.Timestamp.fromDate(new Date(this.currentEvent.startTime)),
            endTime: firestore.Timestamp.fromDate(new Date(this.currentEvent.endTime)),
            travelTime: this.currentEvent.travelTime || 15,
            status: 'completed',
            completedAt: firestore.Timestamp.fromDate(completedAt),
            arrivedOnTime: arrivedOnTime,
            wasEarly: wasEarly,
            createdAt: firestore.Timestamp.now(),
          };

          await firestore().collection('events').add(eventData);
          console.log('✅ Local event synced to Firestore as completed');
        } catch (firestoreError) {
          console.log('⚠️ Could not sync local event to Firestore:', firestoreError.message);
        }
      }

      // Update local events
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const localEventsData = await AsyncStorage.getItem('localEvents');
      if (localEventsData) {
        const eventTime = new Date(this.currentEvent.startTime.toDate ? this.currentEvent.startTime.toDate() : this.currentEvent.startTime);
        const minutesEarly = (eventTime - completedAt) / (1000 * 60);
        const wasEarly = minutesEarly >= 10;

        const events = JSON.parse(localEventsData);
        const updatedEvents = events.map(event =>
          event.id === this.currentEvent.id
            ? {
                ...event,
                status: 'completed',
                completedAt: completedAt.toISOString(),
                arrivedOnTime: arrivedOnTime,
                wasEarly: wasEarly
              }
            : event
        );
        await AsyncStorage.setItem('localEvents', JSON.stringify(updatedEvents));
        console.log('✅ Local event status updated:', {
          id: this.currentEvent.id,
          status: 'completed',
          completedAt: completedAt.toISOString(),
          arrivedOnTime,
          wasEarly,
        });
      }

      // Award points and achievements
      if (arrivedOnTime) {
        console.log('🏆 Awarding points for on-time arrival');
        const pointsAwarded = await GamificationService.awardPoints(50, 'On-time arrival');
        await GamificationService.checkAndAwardBadges();
        
        console.log('🎯 Points awarded:', pointsAwarded);
        
        // Show achievement notification with points
        NotificationService.showArrivalNotification(this.currentEvent, true, pointsAwarded);
      } else {
        console.log('⚠️ Late arrival - no points awarded');
        NotificationService.showArrivalNotification(this.currentEvent, false, 0);
      }

    } catch (error) {
      console.error('❌ Error updating event completion:', error);
    }
  }

  async emergencyUnlock(pin) {
    try {
      // Get the user's emergency PIN from storage
      const storedPin = await AsyncStorage.getItem('emergencyPin');
      const correctPin = storedPin || '1234'; // Default fallback
      
      console.log('Verifying PIN:', pin, 'against stored PIN:', correctPin);
      
      if (pin === correctPin) {
        this.unlock('Emergency unlock');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying emergency PIN:', error);
      return false;
    }
  }
}

export default new LockService();