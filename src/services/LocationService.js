import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import moment from 'moment';

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.isTracking = false;
  }

  async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'OnTimeHero needs access to your location to track your arrival at events and provide accurate departure reminders.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          console.log('✅ Got current location:', this.currentLocation);
          resolve(this.currentLocation);
        },
        (error) => {
          console.error('❌ Location error:', error);
          // If we have a cached location, use it
          if (this.currentLocation) {
            console.log('⚠️ Using cached location due to error');
            resolve(this.currentLocation);
          } else {
            reject(error);
          }
        },
        {
          enableHighAccuracy: false, // Use false for faster response
          timeout: 30000, // Increased to 30 seconds
          maximumAge: 300000, // Accept locations up to 5 minutes old
        }
      );
    });
  }

  startLocationTracking(callback) {
    if (this.isTracking) return;

    this.isTracking = true;
    this.watchId = Geolocation.watchPosition(
      (position) => {
        this.currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        
        if (callback) {
          callback(this.currentLocation);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 2000, // Fastest update every 2 seconds
      }
    );
  }

  stopLocationTracking() {
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
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

    return R * c; // Distance in meters
  }

  async geocodeLocation(address) {
    // In production, use Google Maps Geocoding API
    // For demo purposes, return mock coordinates
    const mockLocations = {
      'conference room b': { latitude: 37.7749, longitude: -122.4194 },
      'office': { latitude: 37.7751, longitude: -122.4196 },
      'meeting room a': { latitude: 37.7753, longitude: -122.4198 },
      'cafeteria': { latitude: 37.7755, longitude: -122.4200 },
      'lobby': { latitude: 37.7757, longitude: -122.4202 },
      'parking lot': { latitude: 37.7759, longitude: -122.4204 },
    };

    const normalizedAddress = address.toLowerCase().trim();
    return mockLocations[normalizedAddress] || null;
  }

  async checkArrivalAtLocation(event, currentLocation) {
    if (!event.location || !currentLocation) return false;

    const eventCoords = await this.geocodeLocation(event.location);
    if (!eventCoords) return false;

    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      eventCoords.latitude,
      eventCoords.longitude
    );

    // Consider arrived if within 50 meters
    return distance < 50;
  }

  async checkDepartureFromHome(event, currentLocation) {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      // Get user's home location from Firestore
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      const userData = userDoc.data();
      const homeLocation = userData?.homeLocation;

      if (!homeLocation || !currentLocation) return false;

      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        homeLocation.latitude,
        homeLocation.longitude
      );

      // Consider departed if more than 100 meters from home
      return distance > 100;
    } catch (error) {
      console.error('Error checking departure from home:', error);
      return false;
    }
  }

  async setHomeLocation(latitude, longitude, address = '') {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;

    try {
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          homeLocation: {
            latitude,
            longitude,
            address,
            setAt: firestore.Timestamp.now(),
          },
        });
      return true;
    } catch (error) {
      console.error('Error setting home location:', error);
      return false;
    }
  }

  async getHomeLocation() {
    const currentUser = auth().currentUser;
    if (!currentUser) return null;

    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      return userDoc.data()?.homeLocation || null;
    } catch (error) {
      console.error('Error getting home location:', error);
      return null;
    }
  }

  async estimateTravelTime(destinationAddress, mode = 'driving') {
    // In production, use Google Maps Distance Matrix API
    // For demo purposes, return mock travel times
    const mockTravelTimes = {
      'conference room b': 5,
      'office': 8,
      'meeting room a': 3,
      'cafeteria': 10,
      'lobby': 2,
      'parking lot': 15,
    };

    const normalizedAddress = destinationAddress.toLowerCase().trim();
    return mockTravelTimes[normalizedAddress] || 15; // Default 15 minutes
  }

  async getDepartureTime(event) {
    const eventTime = moment(event.startTime.toDate());
    const travelTime = await this.estimateTravelTime(event.location);
    const bufferTime = 5; // 5 minutes buffer
    const departureTime = eventTime.clone().subtract(travelTime + bufferTime, 'minutes');
    
    return {
      departureTime: departureTime.toDate(),
      travelTime,
      bufferTime,
    };
  }

  async checkIfShouldLeaveNow(event) {
    const { departureTime } = await this.getDepartureTime(event);
    const now = moment();
    
    return {
      shouldLeave: now.isAfter(departureTime),
      timeUntilDeparture: moment.duration(departureTime.diff(now)),
      departureTime,
    };
  }

  async startDepartureMonitoring(event, onDepartureAlert) {
    const checkInterval = setInterval(async () => {
      try {
        const { shouldLeave, timeUntilDeparture } = await this.checkIfShouldLeaveNow(event);
        
        if (shouldLeave) {
          onDepartureAlert({
            event,
            message: `It's time to leave for "${event.title}"!`,
            urgency: 'high',
          });
          clearInterval(checkInterval);
        } else if (timeUntilDeparture.asMinutes() <= 10) {
          onDepartureAlert({
            event,
            message: `You need to leave in ${Math.ceil(timeUntilDeparture.asMinutes())} minutes for "${event.title}"`,
            urgency: 'medium',
          });
        }
      } catch (error) {
        console.error('Error in departure monitoring:', error);
      }
    }, 30000); // Check every 30 seconds

    return checkInterval;
  }

  async logLocationEvent(type, location, eventId = null) {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      await firestore()
        .collection('location_logs')
        .add({
          userId: currentUser.uid,
          type, // 'arrival', 'departure', 'check_in'
          location,
          eventId,
          timestamp: firestore.Timestamp.now(),
          accuracy: location.accuracy,
        });
    } catch (error) {
      console.error('Error logging location event:', error);
    }
  }

  async getLocationHistory(limit = 50) {
    const currentUser = auth().currentUser;
    if (!currentUser) return [];

    try {
      const logsSnapshot = await firestore()
        .collection('location_logs')
        .where('userId', '==', currentUser.uid)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  }
}

export default new LocationService();

