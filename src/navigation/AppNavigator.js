import React, { useContext, useState, useRef, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View, StyleSheet, Text, Animated, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { AuthContext } from '../contexts/AuthContext';
import { Colors, BorderRadius } from '../styles/theme';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import CalendarScreen from '../screens/main/CalendarScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AddEventScreen from '../screens/main/AddEventScreen';
import EditEventScreen from '../screens/main/EditEventScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import HelpScreen from '../screens/main/HelpScreen';
import JourneyTrackingScreen from '../screens/main/JourneyTrackingScreen';
import JourneyOptionsScreen from '../screens/main/JourneyOptionsScreen';
import VoiceEventScreen from '../screens/main/VoiceEventScreen';
import PhoneLockScreen from '../screens/alerts/PhoneLockScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Calendar') {
            iconName = 'calendar-today';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else if (route.name === 'AddEventTab') {
            // This will be replaced by a custom button
            return null;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.text.primary,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.7)', // Brighter for better visibility
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', // Much more opaque for better visibility
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.3)', // Brighter border for contrast
          position: 'absolute',
          elevation: 0,
          backdropFilter: 'blur(20px)', // Add blur effect
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen
        name="AddEventTab"
        component={AddEventScreen}
        options={({ navigation }) => ({
          tabBarLabel: '',
          tabBarButton: (props) => (
            <CustomAddButton {...props} navigation={navigation} />
          ),
        })}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Animated AI-Powered Add Button Component
const CustomAddButton = ({ children, onPress, navigation }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Continuous pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    
    return () => pulseAnimation.stop();
  }, []);

  const handlePress = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setShowOptions(true);

    // Animate button press and rotation
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Show options with animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -120,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setIsAnimating(false));
    }, 150);
  };

  const selectOption = (type) => {
    // Hide options with animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowOptions(false);
      setIsAnimating(false);
      
      // Reset animations
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Navigate based on selection
      if (type === 'voice') {
        navigation.navigate('VoiceEvent');
      } else if (type === 'manual') {
        navigation.navigate('AddEvent');
      }
    });
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.addButtonContainer}>
      {/* Blurred background overlay */}
      {showOptions && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => selectOption(null)}
        >
          <BlurView
            style={styles.blurOverlay}
            blurType="light"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.8)"
          />
        </TouchableOpacity>
      )}

      {/* Options */}
      {showOptions && (
        <Animated.View
          style={[
            styles.optionsContainer,
            {
              opacity: opacityAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => selectOption('voice')}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.optionGradient}
            >
              <Icon name="auto-awesome" size={24} color="#fff" />
              <Text style={styles.optionText}>AI</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => selectOption('manual')}
          >
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              style={styles.optionGradient}
            >
              <Icon name="edit" size={24} color="#fff" />
              <Text style={styles.optionText}>Manual</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Main button */}
      <TouchableOpacity
        style={styles.addButtonWrapper}
        onPress={handlePress}
        disabled={isAnimating}
      >
        <Animated.View
          style={[
            styles.addButton,
            {
              transform: [
                { scale: Animated.multiply(scaleAnim, pulseAnim) },
                { rotate: rotateInterpolate },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            style={styles.addButtonGradient}
          >
            <Icon name="add" size={32} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  addButtonContainer: {
    position: 'relative',
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
    zIndex: 1000,
  },
  addButtonWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  addButtonGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: -screenHeight,
    left: -screenWidth,
    width: screenWidth * 2,
    height: screenHeight * 2,
    zIndex: 999,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  optionsContainer: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    zIndex: 1001,
  },
  optionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  optionGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

const AppNavigator = () => {
  const { user } = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="AddEvent" component={AddEventScreen} />
          <Stack.Screen name="EditEvent" component={EditEventScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="HelpScreen" component={HelpScreen} />
          <Stack.Screen name="PhoneLock" component={PhoneLockScreen} />
          <Stack.Screen name="JourneyOptions" component={JourneyOptionsScreen} />
          <Stack.Screen name="JourneyTracking" component={JourneyTrackingScreen} />
          <Stack.Screen name="VoiceEvent" component={VoiceEventScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
