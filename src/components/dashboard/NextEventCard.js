import React, { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import LocationService from '../../services/LocationService';
import GoogleMapsService from '../../services/GoogleMapsService';

const NextEventCard = ({ event, onLeaveNow, onCardPress, onStartJourney }) => {
  const [timeToLeave, setTimeToLeave] = useState('');
  const [isTimeToGo, setIsTimeToGo] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('Your Location');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [calculatedTravelTime, setCalculatedTravelTime] = useState(null);
  const isCompleted = event.status === 'completed';

  // Get current location and reverse geocode to address
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const hasPermission = await LocationService.requestLocationPermission();
        if (hasPermission) {
          const location = await LocationService.getCurrentLocation();
          setCurrentLocation(location);

          // Reverse geocode to get address
          if (location) {
            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=AIzaSyCjpfpg6D4w8nnW10Xkoz8DoWGS-0b6v6Q`
              );
              const data = await response.json();
              if (data.results && data.results[0]) {
                const address = data.results[0].formatted_address;
                // Truncate address - show first part (street/area) only
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
      } finally {
        setLoadingLocation(false);
      }
    };

    fetchLocation();
    // Update location every 30 seconds
    const locationInterval = setInterval(fetchLocation, 30000);

    return () => clearInterval(locationInterval);
  }, []);

  // Calculate travel time if event has location
  useEffect(() => {
    const calculateTravelTime = async () => {
      if (!event.location || isCompleted) return;

      try {
        const eventTime = event.startTime.toDate ? event.startTime.toDate() : event.startTime;
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
          console.log('🚗 Calculated travel time:', travelInfo.duration, 'minutes for', event.title);
          setCalculatedTravelTime(travelInfo.duration);
        }
      } catch (error) {
        console.log('Could not calculate travel time:', error);
      }
    };

    calculateTravelTime();
    // Recalculate travel time every 5 minutes
    const travelTimeInterval = setInterval(calculateTravelTime, 300000);

    return () => clearInterval(travelTimeInterval);
  }, [event.location, event.title, isCompleted]);

  useEffect(() => {
    // Debug: Log event data including travel time
    console.log('🎯 NextEventCard received event:', {
      title: event.title,
      status: event.status,
      travelTime: event.travelTime,
      travelTimeType: typeof event.travelTime,
      startTime: event.startTime,
      startTimeToDate: event.startTime?.toDate?.(),
      formatted: moment(event.startTime.toDate()).format('YYYY-MM-DD HH:mm:ss'),
      arrivedOnTime: event.arrivedOnTime,
    });

    // Don't update timer if event is completed
    if (isCompleted) {
      setTimeToLeave(event.arrivedOnTime === true ? 'Arrived on time!' : 'Arrived late');
      return;
    }

    const updateTimer = setInterval(() => {
      const eventTime = moment(event.startTime.toDate());
      const actualTravelTime = calculatedTravelTime || event.travelTime || 15;
      console.log('🚗 Using travel time:', actualTravelTime, 'minutes (calculated:', calculatedTravelTime, ', event:', event.travelTime, ') for event:', event.title);
      const leaveTime = eventTime.clone().subtract(actualTravelTime, 'minutes');
      const now = moment();

      const diff = leaveTime.diff(now, 'minutes');
      const hoursUntilLeave = diff / 60;

      // NEVER show red ("time to go") for events more than 24 hours away
      if (hoursUntilLeave > 24) {
        setIsTimeToGo(false);
        const totalHours = Math.floor(diff / 60);
        const mins = diff % 60;
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        setTimeToLeave(`Leave in ${days}d ${hours}h ${mins}m`);
      } else if (diff <= 0) {
        setIsTimeToGo(true);
        setTimeToLeave('Leave now!');
      } else if (diff < 60) {
        setTimeToLeave(`Leave in ${diff} minutes`);
        if (diff <= 5) setIsTimeToGo(true);
      } else {
        const totalHours = Math.floor(diff / 60);
        const mins = diff % 60;
        setTimeToLeave(`Leave in ${totalHours}h ${mins}m`);
      }
    }, 1000);

    return () => clearInterval(updateTimer);
  }, [event, isCompleted, calculatedTravelTime]);

  // Live refresh when route is updated elsewhere
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('EVENT_ROUTE_UPDATED', (updatedEvent) => {
      if (updatedEvent.id === event.id) {
        // Update displayed fields
        event.origin = updatedEvent.origin;
        event.location = updatedEvent.location;
      }
    });
    return () => sub.remove();
  }, [event]);

  // Choose gradient colors based on status
  const gradientColors = isCompleted
    ? (event.arrivedOnTime === true)
      ? ['#4CAF50', '#66bb6a'] // Green for on-time arrival
      : ['#ff9800', '#ffb74d'] // Orange for late arrival
    : isTimeToGo
    ? ['#ff6b6b', '#ff8e53'] // Red for time to go
    : ['#667eea', '#764ba2']; // Purple for upcoming

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onCardPress && onCardPress(event)}
    >
      <LinearGradient
        colors={gradientColors}
        style={[styles.container, (isTimeToGo || isCompleted) && styles.urgentContainer]}
      >
      {isCompleted && (
        <View style={styles.urgentBadge}>
          <Icon name={event.arrivedOnTime === true ? 'check-circle' : 'schedule'} size={20} color="#fff" />
          <Text style={styles.urgentText}>
            {event.arrivedOnTime === true ? 'ARRIVED ON TIME!' : 'ARRIVED LATE'}
          </Text>
        </View>
      )}
      {!isCompleted && isTimeToGo && (
        <View style={styles.urgentBadge}>
          <Icon name="warning" size={20} color="#fff" />
          <Text style={styles.urgentText}>TIME TO GO!</Text>
        </View>
      )}

      <Text style={styles.eventDate}>
        {moment(event.startTime.toDate()).format('dddd, MMMM D')}
      </Text>
      <Text style={styles.eventTime}>
        {(() => {
          const eventTime = moment(event.startTime.toDate());
          console.log('🎯 NextEventCard displaying time:', {
            original: event.startTime,
            toDate: event.startTime.toDate(),
            moment: eventTime.format('YYYY-MM-DD HH:mm:ss'),
            display: eventTime.format('h:mm A')
          });
          return eventTime.format('h:mm A');
        })()}
      </Text>
      <Text style={styles.eventName}>{event.title}</Text>

      {/* Journey Visualization */}
      {event.location && (
        <View style={styles.journeyContainer}>
          <View style={styles.journeyRow}>
            <View style={styles.journeyPoint}>
              <View style={styles.toDot} />
              <View style={styles.journeyInfo}>
                <Text style={styles.journeyLabel}>To</Text>
                <Text style={styles.journeyLocation} numberOfLines={2}>
                  {event.location.length > 30 ? event.location.substring(0, 30) + '...' : event.location}
                </Text>
              </View>
            </View>

            <View style={styles.journeyLine}>
              <Icon name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
              <View style={styles.travelTimeChip}>
                <Icon name="directions-car" size={14} color="#fff" />
                <Text style={styles.travelTimeText}>
                  {calculatedTravelTime || event.travelTime || 15} min
                </Text>
              </View>
            </View>

            <View style={styles.journeyPoint}>
              <View style={styles.fromDot} />
              <View style={styles.journeyInfo}>
                <Text style={styles.journeyLabel}>From</Text>
                <Text style={styles.journeyLocation} numberOfLines={1}>
                  {event.origin && event.origin !== 'CURRENT_LOCATION'
                    ? (event.origin.length > 30 ? event.origin.substring(0, 30) + '...' : event.origin)
                    : (loadingLocation
                        ? <ActivityIndicator size="small" color="#fff" />
                        : currentAddress)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.leaveTimeContainer}>
        <Icon name="notifications-active" size={20} color="#fff" />
        <Text style={styles.leaveTime}>{timeToLeave}</Text>
      </View>

      {isCompleted && event.arrivedOnTime === true && (
        <View style={styles.completedInfo}>
          <Icon name="stars" size={24} color="#fff" />
          <Text style={styles.completedText}>+50 XP earned!</Text>
        </View>
      )}
      {!isCompleted && (
        <View style={styles.buttonsContainer}>
          {isTimeToGo && (
            <TouchableOpacity style={styles.leaveButton} onPress={onLeaveNow}>
              <Text style={styles.leaveButtonText}>I'm Leaving Now! 🏃</Text>
            </TouchableOpacity>
          )}
          {event.location && (
            <TouchableOpacity
              style={[styles.journeyButton, isTimeToGo && styles.journeyButtonSmall]}
              onPress={() => onStartJourney && onStartJourney(event)}
            >
              <Icon name="directions" size={20} color="#fff" />
              <Text style={styles.journeyButtonText}>Start Journey</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    minHeight: 280,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  urgentContainer: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
  },
  urgentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  eventDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  eventName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  journeyContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journeyPoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fromDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
    alignSelf: 'center',
  },
  toDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff6b6b',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
    alignSelf: 'center',
  },
  journeyInfo: {
    flex: 1,
  },
  journeyLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  journeyLocation: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  journeyLine: {
    alignItems: 'center',
    marginHorizontal: 8,
    minWidth: 60,
  },
  travelTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  travelTimeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  leaveTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 10,
  },
  leaveTime: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  buttonsContainer: {
    marginTop: 15,
    gap: 10,
  },
  leaveButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  journeyButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  journeyButtonSmall: {
    padding: 12,
  },
  journeyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 15,
    marginTop: 15,
  },
  completedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default NextEventCard;