/**
 * OnTimeHero React Native App
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/NotificationService';
import { AuthProvider } from './src/contexts/AuthContext';

const App = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState();
  const initializingRef = useRef(true);

  useEffect(() => {
    requestNotificationPermission();

    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);

    // Use a ref so the timeout sees the live value, not a stale closure
    const timeoutId = setTimeout(() => {
      if (initializingRef.current) {
        console.log('Firebase auth initialization timeout, proceeding anyway');
        setInitializing(false);
      }
    }, 5000);

    return () => {
      subscriber();
      clearTimeout(timeoutId);
    };
  }, []);

  const requestNotificationPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        await AsyncStorage.setItem('fcmToken', token);
      }
    } catch (error) {
      console.warn('Notification permission error:', error);
    }
  };

  const onAuthStateChanged = (user: any) => {
    setUser(user);
    if (initializingRef.current) {
      initializingRef.current = false;
      setInitializing(false);
    }
  };

  if (initializing) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading OnTimeHero...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider value={{ user }}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333333',
  },
});

export default App;
