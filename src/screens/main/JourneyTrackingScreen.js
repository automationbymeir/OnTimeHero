import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import moment from 'moment';
import GoogleMapsService from '../../services/GoogleMapsService';
import LocationService from '../../services/LocationService';
import NotificationService from '../../services/NotificationService';
import GamificationService from '../../services/GamificationService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const { width, height } = Dimensions.get('window');

const JourneyTrackingScreen = ({ route, navigation }) => {
  const { event } = route.params;
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [eta, setEta] = useState(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [arrivalProcessed, setArrivalProcessed] = useState(false);
  const mapRef = useRef(null);
  const watchId = useRef(null);

  useEffect(() => {
    // Get destination coordinates from event location
    initializeJourney();

    // Start watching user's location
    startLocationTracking();

    return () => {
      // Stop location tracking on cleanup
      LocationService.stopLocationTracking();
    };
  }, []);

  const initializeJourney = async () => {
    try {
      // Get destination coordinates
      if (event.location) {
        const destinationCoords = await GoogleMapsService.geocodeAddress(event.location);
        if (destinationCoords) {
          setDestination({
            latitude: destinationCoords.lat,
            longitude: destinationCoords.lng,
            title: event.location,
          });
          console.log('📍 Destination set:', event.location, destinationCoords);
        }
      }
    } catch (error) {
      console.error('Error initializing journey:', error);
    }
  };

  const startLocationTracking = async () => {
    // Request location permission first
    const hasPermission = await LocationService.requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Location permission is required to track your journey. Please enable it in settings.');
      return;
    }

    // Get initial location using LocationService
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        console.log('📍 Initial location:', location);

        // Fit map to show both current location and destination
        if (mapRef.current && destination) {
          mapRef.current.fitToCoordinates([location, destination], {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error getting initial location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please try again.');
    }

    // Start watching location changes using LocationService
    LocationService.startLocationTracking((newLocation) => {
      setCurrentLocation(newLocation);

        // Check if user has arrived (within 50 meters of destination)
        if (destination && !hasArrived) {
          const distanceToDestination = calculateDistance(
            newLocation.latitude,
            newLocation.longitude,
            destination.latitude,
            destination.longitude
          );

          console.log('📍 Distance to destination:', distanceToDestination, 'meters');

          if (distanceToDestination < 50) {
            setHasArrived(true);
            Alert.alert(
              '🎯 Arrived!',
              'You\'ve arrived at your destination! Tap "I Arrived" to confirm.',
              [{ text: 'OK' }]
            );
          }
        }

      // Update route with current location
      updateRoute(newLocation);
    });
  };

  const updateRoute = async (origin) => {
    if (!destination) return;

    try {
      // Get route from Google Maps Directions API
      const route = await GoogleMapsService.getDirections(
        `${origin.latitude},${origin.longitude}`,
        `${destination.latitude},${destination.longitude}`
      );

      if (route && route.routes && route.routes.length > 0) {
        const leg = route.routes[0].legs[0];

        // Update distance and duration
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);

        // Calculate ETA
        const etaTime = moment().add(leg.duration.value, 'seconds');
        setEta(etaTime.format('h:mm A'));

        // Decode polyline to get route coordinates
        const points = decodePolyline(route.routes[0].overview_polyline.points);
        setRouteCoordinates(points);

        console.log('🗺️ Route updated:', leg.distance.text, leg.duration.text);
      }
    } catch (error) {
      console.error('Error updating route:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula to calculate distance in meters
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const decodePolyline = (encoded) => {
    // Decode Google Maps polyline algorithm
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  };

  const handleArrived = async () => {
    // Prevent multiple submissions
    if (arrivalProcessed) {
      console.log('⚠️ Arrival already processed, ignoring duplicate request');
      return;
    }

    try {
      setArrivalProcessed(true);

      const eventTime = moment(event.startTime.toDate ? event.startTime.toDate() : event.startTime);
      const now = moment();
      const isOnTime = now.isSameOrBefore(eventTime);
      const wasEarly = now.isBefore(eventTime.clone().subtract(5, 'minutes'));

      console.log('🎯 Arrival confirmed');
      console.log('🎯 Event time:', eventTime.format('YYYY-MM-DD HH:mm:ss'));
      console.log('🎯 Arrival time:', now.format('YYYY-MM-DD HH:mm:ss'));
      console.log('🎯 Is on time:', isOnTime);
      console.log('🎯 Was early:', wasEarly);

      // Update event status in Firestore or Local Storage
      const currentUser = auth().currentUser;
      const lastModified = new Date();

      if (event.isLocal) {
        // Update local event
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const localEventsData = await AsyncStorage.getItem('localEvents');
        console.log('📍 Local events data exists:', !!localEventsData);
        if (localEventsData) {
          const localEvents = JSON.parse(localEventsData);
          console.log('📍 Total local events before update:', localEvents.length);
          console.log('📍 Looking for event ID:', event.id);

          const updatedEvents = localEvents.map(e => {
            if (e.id === event.id) {
              console.log('📍 Found matching event, updating status to completed');
              return {
                ...e,
                status: 'completed',
                arrivedOnTime: isOnTime,
                wasEarly: wasEarly,
                completedAt: new Date().toISOString(),
                lastModified: lastModified.toISOString(),
              };
            }
            return e;
          });

          await AsyncStorage.setItem('localEvents', JSON.stringify(updatedEvents));
          console.log('✅ Local event updated successfully');

          // Verify the update
          const verifyData = await AsyncStorage.getItem('localEvents');
          const verifyEvents = JSON.parse(verifyData);
          const updatedEvent = verifyEvents.find(e => e.id === event.id);
          console.log('📍 Verification - Event status after save:', updatedEvent?.status);
          console.log('📍 Verification - Event arrivedOnTime:', updatedEvent?.arrivedOnTime);
        }
      } else if (currentUser && event.id) {
        // Update Firestore event
        console.log('📍 Updating Firestore event ID:', event.id);
        await firestore()
          .collection('events')
          .doc(event.id)
          .update({
            status: 'completed',
            arrivedOnTime: isOnTime,
            wasEarly: wasEarly,
            completedAt: firestore.Timestamp.now(),
            lastModified: firestore.Timestamp.fromDate(lastModified),
          });
        console.log('✅ Firestore event updated successfully');

        // Verify the update
        const verifyDoc = await firestore().collection('events').doc(event.id).get();
        console.log('📍 Verification - Firestore event status:', verifyDoc.data()?.status);
        console.log('📍 Verification - Firestore arrivedOnTime:', verifyDoc.data()?.arrivedOnTime);
      }

      // Award points using the proper event points method
      const updatedEvent = {
        ...event,
        status: 'completed',
        arrivedOnTime: isOnTime,
        wasEarly: wasEarly,
      };
      await GamificationService.awardEventPoints(updatedEvent);
      await GamificationService.checkAchievements();

      // Show arrival notification with correct XP
      const xpAwarded = wasEarly ? 100 : (isOnTime ? 50 : 0);
      await NotificationService.showArrivalNotification(event, isOnTime, xpAwarded);

      // Navigate back to dashboard
      Alert.alert(
        wasEarly ? '🌟 Amazing!' : (isOnTime ? '🎉 Great Job!' : '⚠️ Arrived Late'),
        wasEarly
          ? 'You arrived early! +100 XP earned!'
          : (isOnTime
            ? 'You arrived on time! +50 XP earned!'
            : 'You arrived late. Try to leave earlier next time.'),
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs', { screen: 'Dashboard' }),
          },
        ]
      );
    } catch (error) {
      console.error('Error handling arrival:', error);
      Alert.alert('Error', 'Failed to record arrival. Please try again.');
      // Reset the processed flag if there was an error
      setArrivalProcessed(false);
    }
  };

  return (
    <View style={styles.container}>
      {currentLocation && destination ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={true}
        >
          {/* Current location marker */}
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            pinColor="blue"
          >
            <View style={styles.currentLocationMarker}>
              <Icon name="navigation" size={30} color="#4facfe" />
            </View>
          </Marker>

          {/* Destination marker */}
          <Marker
            coordinate={destination}
            title={event.title}
            description={destination.title}
            pinColor="red"
          >
            <View style={styles.destinationMarker}>
              <Icon name="place" size={40} color="#ff6b6b" />
            </View>
          </Marker>

          {/* Route polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#4facfe"
            />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Icon name="location-searching" size={80} color="#667eea" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {/* Info panel */}
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,1)']}
        style={styles.infoPanel}
      >
        <Text style={styles.eventTitle}>{event.title}</Text>
        {event.location && (
          <View style={styles.locationContainer}>
            <Icon name="place" size={16} color="#666" />
            <Text style={styles.locationText}>{event.location}</Text>
          </View>
        )}

        <View style={styles.statsContainer}>
          {distance && (
            <View style={styles.statItem}>
              <Icon name="straighten" size={24} color="#667eea" />
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{distance}</Text>
            </View>
          )}
          {duration && (
            <View style={styles.statItem}>
              <Icon name="schedule" size={24} color="#667eea" />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{duration}</Text>
            </View>
          )}
          {eta && (
            <View style={styles.statItem}>
              <Icon name="access-time" size={24} color="#667eea" />
              <Text style={styles.statLabel}>ETA</Text>
              <Text style={styles.statValue}>{eta}</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.arrivedButton, hasArrived && styles.arrivedButtonActive]}
            onPress={handleArrived}
          >
            <LinearGradient
              colors={hasArrived ? ['#4CAF50', '#66bb6a'] : ['#667eea', '#764ba2']}
              style={styles.buttonGradient}
            >
              <Icon name="check-circle" size={24} color="#fff" />
              <Text style={styles.arrivedButtonText}>
                {hasArrived ? "I've Arrived! ✓" : "Mark as Arrived"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel Journey</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#667eea',
    fontWeight: '600',
  },
  currentLocationMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  destinationMarker: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  buttonContainer: {
    gap: 12,
  },
  arrivedButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  arrivedButtonActive: {
    elevation: 5,
    shadowOpacity: 0.3,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  arrivedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
  },
});

export default JourneyTrackingScreen;
