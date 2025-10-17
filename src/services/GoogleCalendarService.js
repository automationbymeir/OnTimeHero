import { GoogleSignin } from '@react-native-google-signin/google-signin';
import moment from 'moment';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

class GoogleCalendarService {
  constructor() {
    this.configureGoogleSignIn();
    this.tokenPromise = null; // Prevent concurrent getTokens calls
    this.cachedTokens = null;
    this.tokenExpiry = null;
  }

  configureGoogleSignIn() {
    try {
      GoogleSignin.configure({
        // Request Calendar read access and profile/email for Firebase linking
        scopes: ['https://www.googleapis.com/auth/calendar', 'email', 'profile'],
        // Web Client ID is required for Google Sign-In to work properly
        webClientId: '574885181091-rutnfbrqmiu01gjlp7gsfvo3mc2n8ecs.apps.googleusercontent.com',
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      console.log('Google Sign-In configured successfully with Web Client ID');
    } catch (error) {
      console.error('Error configuring Google Sign-In:', error);
    }
  }

  async getTokensSafely() {
    try {
      // If we already have a token request in progress, wait for it
      if (this.tokenPromise) {
        console.log('Token request already in progress, waiting...');
        return await this.tokenPromise;
      }

      // Check if we have cached tokens that are still valid
      if (this.cachedTokens && this.tokenExpiry && new Date() < this.tokenExpiry) {
        console.log('Using cached tokens');
        return this.cachedTokens;
      }

      // Create a new token request
      console.log('Requesting new tokens...');
      this.tokenPromise = GoogleSignin.getTokens();
      
      const tokens = await this.tokenPromise;
      
      // Cache the tokens for 50 minutes (tokens typically expire in 1 hour)
      this.cachedTokens = tokens;
      this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000); // 50 minutes from now
      
      // Clear the promise
      this.tokenPromise = null;
      
      console.log('Tokens obtained and cached successfully');
      return tokens;
    } catch (error) {
      // Clear the promise on error
      this.tokenPromise = null;
      console.error('Error getting tokens:', error);
      throw error;
    }
  }

  async ensureSignedIn() {
    try {
      // Check if Google Play Services are available
      const hasPlayServices = await GoogleSignin.hasPlayServices({ 
        showPlayServicesUpdateDialog: true 
      });
      if (!hasPlayServices) {
        throw new Error('Google Play Services not available');
      }

      // Try to get current user first
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        return currentUser;
      }

      // Try silent sign-in
      const userInfo = await GoogleSignin.signInSilently();
      return userInfo;
    } catch (error) {
      console.log('Silent sign-in failed, prompting user:', error.message);
      
      try {
        // No cached session → ask user to pick account
        const userInfo = await GoogleSignin.signIn();
        return userInfo;
      } catch (signInError) {
        console.error('Google Sign-In failed:', signInError);
        throw new Error(`Google Sign-In failed: ${signInError.message}`);
      }
    }
  }

  async syncCalendarEvents() {
    try {
      console.log('Starting calendar sync...');
      
      // First, try to sync any pending data
      await this.syncPendingData();
      
      // Ensure the user is signed in with Calendar scope
      const userInfo = await this.ensureSignedIn();
      if (!userInfo) {
        throw new Error('User not signed in');
      }

      console.log('User signed in successfully:', userInfo.user?.email);
      console.log('Getting tokens safely...');
      const tokens = await this.getTokensSafely();
      const accessToken = tokens.accessToken;

      if (!accessToken) {
        throw new Error('No access token available');
      }

      console.log('Access token obtained, fetching calendar events...');
      // Fetch events from Google Calendar API
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${moment().toISOString()}&` +
        `timeMax=${moment().add(30, 'days').toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Calendar API error:', response.status, errorData);
        throw new Error(`Calendar API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('Calendar API response received:', data);
      
      if (data.items && data.items.length > 0) {
        console.log(`Found ${data.items.length} events, saving to Firestore...`);
        await this.saveEventsToFirestore(data.items);
        console.log('Events saved to Firestore successfully');
      } else {
        console.log('No events found in the next 30 days');
      }

      return data.items || [];
    } catch (error) {
      console.error('Error syncing calendar:', error);
      throw error;
    }
  }

  async saveEventsToFirestore(googleEvents) {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No current user, skipping Firestore save');
      return;
    }

    try {
      console.log(`Saving ${googleEvents.length} events to Firestore...`);
      
      // Check Firestore availability first
      await firestore().enableNetwork();
      console.log('Firestore network enabled');
      
      const batch = firestore().batch();
      const eventsRef = firestore().collection('events');
      let eventsToSave = 0;

      for (const googleEvent of googleEvents) {
        // Skip all-day events or events without dateTime
        if (!googleEvent.start?.dateTime) {
          console.log('Skipping all-day event:', googleEvent.summary);
          continue;
        }

        // Parse the event time properly with timezone handling
        const startDateTime = new Date(googleEvent.start.dateTime);
        const endDateTime = new Date(googleEvent.end.dateTime);

        console.log('Processing event:', googleEvent.summary);
        console.log('Start dateTime from Google:', googleEvent.start.dateTime);
        console.log('Start dateTime parsed:', startDateTime);
        console.log('Start timezone:', googleEvent.start.timeZone);
        console.log('Event ID from Google:', googleEvent.id);

        // Calculate travel time using Google Maps API
        const travelTime = await this.calculateTravelTime(googleEvent.location);

        const eventData = {
          userId: currentUser.uid,
          googleEventId: googleEvent.id,
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description || '',
          startTime: firestore.Timestamp.fromDate(startDateTime),
          endTime: firestore.Timestamp.fromDate(endDateTime),
          location: googleEvent.location || '',
          travelTime: travelTime,
          status: 'upcoming',
          createdAt: firestore.Timestamp.now(),
          lastSynced: firestore.Timestamp.now(),
          timezone: googleEvent.start.timeZone || 'UTC',
        };

        // Check if event already exists
        const existingEvent = await eventsRef
          .where('googleEventId', '==', googleEvent.id)
          .where('userId', '==', currentUser.uid)
          .get();

        if (existingEvent.empty) {
          // Create new event
          const newEventRef = eventsRef.doc();
          batch.set(newEventRef, eventData);
          eventsToSave++;
          console.log(`✅ Prepared new event for Firestore: ${googleEvent.summary} (ID: ${newEventRef.id})`);
        } else {
          // Update existing event, but check if it was recently modified locally
          const existingData = existingEvent.docs[0].data();
          console.log(`📝 Existing event "${googleEvent.summary}" status: ${existingData.status}`);

          // Check if event was modified in the last 5 minutes (to prevent sync conflicts)
          const lastModified = existingData.lastModified;
          if (lastModified) {
            const lastModifiedTime = lastModified.toDate ? lastModified.toDate() : new Date(lastModified);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (lastModifiedTime > fiveMinutesAgo) {
              console.log(`⏰ Event was modified locally ${Math.round((Date.now() - lastModifiedTime.getTime()) / 1000 / 60)} minutes ago, skipping sync to prevent overwriting recent changes`);
              continue;
            }
          }

          // Don't overwrite completed events
          if (existingData.status === 'completed') {
            console.log(`⚠️ Event is completed, preserving status and only updating time/location`);
            // Only update the time and location fields, but keep status as completed
            const partialUpdate = {
              title: eventData.title,
              description: eventData.description,
              location: eventData.location,
              startTime: eventData.startTime,
              endTime: eventData.endTime,
              travelTime: eventData.travelTime,
              timezone: eventData.timezone,
              lastSynced: eventData.lastSynced,
              // Keep existing status, arrivedOnTime, completedAt, and lastModified
            };
            batch.update(existingEvent.docs[0].ref, partialUpdate);
          } else {
            // Update normally for non-completed events
            batch.update(existingEvent.docs[0].ref, eventData);
          }
          eventsToSave++;
          console.log(`✅ Prepared update for existing event: ${googleEvent.summary}`);
        }
      }

      if (eventsToSave > 0) {
        await batch.commit();
        console.log(`Successfully saved ${eventsToSave} events to Firestore`);
      } else {
        console.log('No new events to save');
      }
    } catch (error) {
      console.error('Error saving events to Firestore:', error);
      
      // If Firestore is unavailable, try to save events locally for later sync
      if (error.code === 'unavailable') {
        console.log('Firestore unavailable, storing events locally for later sync');
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const localEvents = JSON.stringify(googleEvents);
          await AsyncStorage.setItem('pendingEvents', localEvents);
          console.log('Events stored locally for later sync');
        } catch (localError) {
          console.error('Error storing events locally:', localError);
        }
      }
      // Don't throw error here to prevent sync failure
    }
  }

  async calculateTravelTime(location) {
    // Use Google Maps API for accurate travel time calculation
    if (!location) return 15; // Default 15 minutes if no location

    // Check if it's an internal location (no need for travel time calculation)
    if (location.toLowerCase().includes('room') ||
        location.toLowerCase().includes('office')) {
      return 5; // Same building
    } else if (location.toLowerCase().includes('building')) {
      return 10; // Different building
    }

    // For external locations, use Google Maps Distance Matrix API
    try {
      const GoogleMapsService = require('./GoogleMapsService').default;
      const travelInfo = await GoogleMapsService.calculateTravelTimeFromHome(location);

      if (travelInfo && !travelInfo.error && travelInfo.duration) {
        console.log(`✅ Calculated travel time for "${location}": ${travelInfo.duration} minutes`);
        return travelInfo.duration;
      } else {
        console.log(`⚠️ Could not calculate travel time for "${location}": ${travelInfo.error || 'Unknown error'}, using default`);
        return 20; // Fallback to 20 minutes if API fails
      }
    } catch (error) {
      console.error(`❌ Error calculating travel time for "${location}":`, error);
      return 20; // Fallback to 20 minutes on error
    }
  }

  async updateEventStatus(eventId, status, checkInTime = null) {
    try {
      const updateData = {
        status: status,
        wasOnTime: status === 'completed',
      };

      if (checkInTime) {
        updateData.checkInTime = firestore.Timestamp.fromDate(checkInTime);
      }

      await firestore()
        .collection('events')
        .doc(eventId)
        .update(updateData);

      // Update user stats if event completed
      if (status === 'completed') {
        await this.updateUserStats(status === 'completed');
      }
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  }

  async updateUserStats(wasOnTime) {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const userRef = firestore().collection('users').doc(currentUser.uid);
    
    await firestore().runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data();

      const updates = {
        totalEvents: (userData.totalEvents || 0) + 1,
        eventsOnTime: wasOnTime ? 
          (userData.eventsOnTime || 0) + 1 : 
          userData.eventsOnTime || 0,
      };

      // Calculate new punctuality score
      updates.punctualityScore = Math.round(
        (updates.eventsOnTime / updates.totalEvents) * 100
      );

      // Update streak
      if (wasOnTime) {
        updates.currentStreak = (userData.currentStreak || 0) + 1;
        updates.longestStreak = Math.max(
          updates.currentStreak,
          userData.longestStreak || 0
        );
      } else {
        updates.currentStreak = 0;
      }

      transaction.update(userRef, updates);
    });
  }

  async syncPendingData() {
    try {
      console.log('Checking for pending data to sync...');
      
      // Check if Firestore is available
      await firestore().enableNetwork();
      
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // Sync pending events
      const pendingEvents = await AsyncStorage.getItem('pendingEvents');
      if (pendingEvents) {
        console.log('Found pending events, syncing to Firestore...');
        const events = JSON.parse(pendingEvents);
        await this.saveEventsToFirestore(events);
        await AsyncStorage.removeItem('pendingEvents');
        console.log('Pending events synced successfully');
      }
      
      // Sync pending profile data
      const pendingProfile = await AsyncStorage.getItem('userProfile');
      if (pendingProfile) {
        console.log('Found pending profile data, syncing to Firestore...');
        const profileData = JSON.parse(pendingProfile);
        const currentUser = auth().currentUser;
        if (currentUser) {
          const userRef = firestore().collection('users').doc(currentUser.uid);
          await userRef.set(profileData, { merge: true });
          await AsyncStorage.removeItem('userProfile');
          console.log('Pending profile data synced successfully');
        }
      }
      
    } catch (error) {
      console.error('Error syncing pending data:', error);
    }
  }

  async getTodaysEvents() {
    try {
      console.log('Fetching today\'s events...');
      
      // Ensure the user is signed in with Calendar scope
      const userInfo = await this.ensureSignedIn();
      if (!userInfo) {
        throw new Error('User not signed in');
      }

      const tokens = await this.getTokensSafely();
      const accessToken = tokens.accessToken;

      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Get today's date range
      const startOfDay = moment().startOf('day').toISOString();
      const endOfDay = moment().endOf('day').toISOString();

      console.log('Fetching events for today:', startOfDay, 'to', endOfDay);

      // Fetch today's events from Google Calendar API
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${startOfDay}&` +
        `timeMax=${endOfDay}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Calendar API error:', response.status, errorData);
        throw new Error(`Calendar API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('Today\'s events fetched:', data.items?.length || 0);
      
      return data.items || [];
    } catch (error) {
      console.error('Error fetching today\'s events:', error);
      throw error;
    }
  }
}

export default new GoogleCalendarService();