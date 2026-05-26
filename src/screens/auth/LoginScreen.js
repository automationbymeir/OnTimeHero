import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Theme, { 
  Colors, 
  Typography, 
  Spacing, 
  BorderRadius, 
  CommonStyles, 
  getTextShadow, 
  getStrongTextShadow, 
  getDynamicBackground, 
  createGlassCard,
  getBackgroundImage,
  getFadeGradient,
  getGreeting,
  getTimeOfDay,
  formatDate
} from '../../styles/theme';
import OnTimeHeroLogo from '../../components/OnTimeHeroLogo';

const { height } = Dimensions.get('window');

// GoogleSignin is configured centrally in GoogleCalendarService on import

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const { idToken, user } = await GoogleSignin.signIn();
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const firebaseUser = await auth().signInWithCredential(googleCredential);
      
      // Update Firebase user profile with Google data
      if (user && firebaseUser.user) {
        await updateFirebaseUserProfile(firebaseUser.user, user);
        await importGoogleProfileData(firebaseUser.user, user);
      }
    } catch (error) {
      Alert.alert('Google Sign In Error', error.message);
    }
  };

  const updateFirebaseUserProfile = async (firebaseUser, googleUser) => {
    try {
      const updates = {};
      
      if (googleUser.name && !firebaseUser.displayName) {
        updates.displayName = googleUser.name;
      }
      
      if (googleUser.photo && !firebaseUser.photoURL) {
        updates.photoURL = googleUser.photo;
      }
      
      if (Object.keys(updates).length > 0) {
        await firebaseUser.updateProfile(updates);
        console.log('Firebase user profile updated with Google data');
      }
    } catch (error) {
      console.error('Error updating Firebase user profile:', error);
    }
  };

  const importGoogleProfileData = async (firebaseUser, googleUser) => {
    try {
      const firestoreInstance = require('@react-native-firebase/firestore').default;
      
      // Check if Firestore is available
      await firestoreInstance().enableNetwork();
      
      const userRef = firestoreInstance().collection('users').doc(firebaseUser.uid);
      
      const userData = {
        displayName: googleUser.name || firebaseUser.displayName,
        email: googleUser.email || firebaseUser.email,
        photoURL: googleUser.photo || firebaseUser.photoURL,
        googleId: googleUser.id,
        lastSignIn: firestoreInstance.FieldValue.serverTimestamp(),
        createdAt: firestoreInstance.FieldValue.serverTimestamp(),
      };
      
      await userRef.set(userData, { merge: true });
      console.log('Google profile data imported successfully');
    } catch (error) {
      console.error('Error importing Google profile data:', error);
      
      // If Firestore is unavailable, store profile data locally
      if (error.code === 'unavailable') {
        console.log('Firestore unavailable, storing profile data locally');
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const profileData = {
            displayName: googleUser.name || firebaseUser.displayName,
            email: googleUser.email || firebaseUser.email,
            photoURL: googleUser.photo || firebaseUser.photoURL,
            googleId: googleUser.id,
            lastSignIn: new Date().toISOString(),
          };
          await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
          console.log('Profile data stored locally');
        } catch (localError) {
          console.error('Error storing profile locally:', localError);
        }
      }
      // Don't throw error to prevent sign-in failure
    }
  };

  const backgroundImage = getBackgroundImage();
  const fadeColors = getFadeGradient();
  const greeting = getGreeting();
  const timeOfDay = getTimeOfDay();

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.logoContainer}>
          <OnTimeHeroLogo width={100} height={112} />
          <Text style={[styles.appName, getTextShadow()]}>OnTime Hero</Text>
          <Text style={[styles.tagline, getTextShadow()]}>Never Be Late Again!</Text>
        </View>

        <View style={[createGlassCard('neutral', 'large'), styles.formContainer]}>
          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={[styles.loginButtonText, getTextShadow()]}>
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.googleButton]}
            onPress={handleGoogleSignIn}
          >
            <Icon name="g-mobiledata" size={24} color="#fff" />
            <Text style={[styles.googleButtonText, getTextShadow()]}>Sign in with Google</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, getTextShadow()]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupLink, getTextShadow()]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

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
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(66, 133, 244, 0.9)',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  signupLink: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;