import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, PermissionsAndroid, Platform, Alert, StyleSheet, Linking, ScrollView, LogBox, TextInput, Modal, KeyboardAvoidingView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import auth from '@react-native-firebase/auth';
import Voice from '@react-native-voice/voice';
import { useNavigation } from '@react-navigation/native';
import GoogleCalendarService from '../../services/GoogleCalendarService';
import Theme, { Colors, Typography, Spacing, BorderRadius, CommonStyles, getTextShadow, getStrongTextShadow, getDynamicBackground, createGlassCard } from '../../styles/theme';
import GoogleMapsService from '../../services/GoogleMapsService';

// Suppress NativeEventEmitter warning from react-native-voice library
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  'EventEmitter.removeListener'
]);

// Simple TTS fallback - just show text for now
const Tts = null;

const requestMicPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      // Check if permission is already granted
      const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (alreadyGranted) {
        return true;
      }

      // Request permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'OnTimeHero needs access to your microphone to create events by voice.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      
      console.log('Microphone permission result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log('Permission request error:', error);
      return false;
    }
  } else if (Platform.OS === 'ios') {
    // For iOS, we assume permission is handled by the system
    // The Voice library will handle iOS permissions automatically
    return true;
  }
  return true;
};

const VoiceEventScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [eventData, setEventData] = useState({});
  const [language, setLanguage] = useState('en-US');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceReady, setIsVoiceReady] = useState(true);
  const isVoiceReadyRef = useRef(true);
  const isShowingAlert = useRef(false);
  const [retryCount, setRetryCount] = useState(0);
  const [inputMode, setInputMode] = useState('voice'); // 'voice' or 'text'
  const [textInput, setTextInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isEventPreviewMinimized, setIsEventPreviewMinimized] = useState(false);
  
  const conversationHistory = useRef([]);
  const scrollViewRef = useRef(null);

  // Load chat history and add welcome message on component mount
  useEffect(() => {
    loadChatHistory();
    // Add welcome message immediately to avoid showing the big mic icon
    setMessages([{
      role: 'assistant',
      content: '👋 Hi! I\'m your voice assistant. Tell me about an event you\'d like to schedule, and I\'ll help you create it.'
    }]);
  }, []);

  // Save chat history after every assistant response
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      // Save after a short delay to ensure the conversation is complete
      const timer = setTimeout(() => {
        saveChatHistory();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const historyData = await AsyncStorage.getItem('chatHistory');
      if (historyData) {
        const parsedHistory = JSON.parse(historyData);
        setChatHistory(parsedHistory);
      }
    } catch (error) {
      console.log('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const conversation = {
        id: Date.now().toString(),
        title: messages.find(m => m.role === 'user')?.content?.substring(0, 50) + '...' || 'New Conversation',
        messages: [...messages],
        timestamp: new Date().toISOString(),
        eventData: eventData
      };
      
      const updatedHistory = [conversation, ...chatHistory].slice(0, 10); // Keep only last 10 conversations
      setChatHistory(updatedHistory);
      await AsyncStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.log('Error saving chat history:', error);
    }
  };

  const loadConversation = (conversation) => {
    setMessages(conversation.messages);
    setEventData(conversation.eventData || {});
    conversationHistory.current = [...conversation.messages];
    setShowHistory(false);
  };

  const startNewConversation = () => {
    setMessages([]);
    setEventData({});
    conversationHistory.current = [];
    setShowHistory(false);
  };

  const calculateLeaveTime = async () => {
    try {
      // Get today's events
      const todaysEvents = await GoogleCalendarService.getTodaysEvents();
      const now = moment();
      
      // Find the next event today
      const nextEvent = todaysEvents
        .filter(event => {
          const eventTime = moment(event.start.dateTime || event.start.date);
          return eventTime.isAfter(now);
        })
        .sort((a, b) => {
          const timeA = moment(a.start.dateTime || a.start.date);
          const timeB = moment(b.start.dateTime || b.start.date);
          return timeA.diff(timeB);
        })[0];

      if (!nextEvent) {
        return "You have no more events today. You're all set!";
      }

      const eventTime = moment(nextEvent.start.dateTime || nextEvent.start.date);
      const eventTitle = nextEvent.summary || 'Untitled Event';
      const eventLocation = nextEvent.location || 'Unknown Location';
      
      // Calculate travel time
      let travelTime = 15; // Default 15 minutes
      try {
        const travelInfo = await GoogleMapsService.calculateTravelTimeFromCurrentLocation(
          eventLocation,
          eventTime.toDate()
        );
        if (travelInfo && !travelInfo.error) {
          travelTime = travelInfo.duration;
        }
      } catch (error) {
        console.warn('Error calculating travel time:', error);
      }

      // Calculate leave time (event time - travel time - 5 minutes buffer)
      const leaveTime = eventTime.subtract(travelTime + 5, 'minutes');
      const timeUntilLeave = leaveTime.diff(now, 'minutes');
      
      if (timeUntilLeave <= 0) {
        return `You should leave NOW for your ${eventTitle} at ${eventTime.format('h:mm A')}! You're running late.`;
      } else if (timeUntilLeave < 5) {
        return `You should leave in ${timeUntilLeave} minutes for your ${eventTitle} at ${eventTime.format('h:mm A')}. Get ready now!`;
      } else {
        return `For your ${eventTitle} at ${eventTime.format('h:mm A')}, you should leave at ${leaveTime.format('h:mm A')} (in ${timeUntilLeave} minutes). Travel time is ${travelTime} minutes.`;
      }
    } catch (error) {
      console.warn('Error calculating leave time:', error);
      return "Sorry, I couldn't calculate your leave time right now. Please try again later.";
    }
  };

  // Format event data for AddEventScreen
  const formatEventData = (data) => {
    const formatted = { ...data };
    
    // Format date to YYYY-MM-DD
    if (formatted.date) {
      const date = moment(formatted.date);
      if (date.isValid()) {
        formatted.date = date.format('YYYY-MM-DD');
      }
    }
    
    // Format time to HH:mm
    if (formatted.time) {
      const time = moment(formatted.time, ['h:mm A', 'HH:mm', 'h:mm', 'H:mm']);
      if (time.isValid()) {
        formatted.time = time.format('HH:mm');
      }
    }
    
    return formatted;
  };

  // Language detection function
  const detectLanguage = (text) => {
    const hebrewPattern = /[\u0590-\u05FF]/;
    if (hebrewPattern.test(text)) return 'he-IL';
    
    const germanPattern = /[äöüÄÖÜß]/;
    if (germanPattern.test(text)) return 'de-DE';
    
    return 'en-US';
  };

  // Greeting messages
  const getGreeting = (lang) => {
    const greetings = {
      'en-US': "Hi! What event would you like to create?",
      'he-IL': "שלום! איזה אירוע תרצה ליצור?",
      'de-DE': "Hallo! Welche Veranstaltung möchten Sie erstellen?"
    };
    return greetings[lang] || greetings['en-US'];
  };

  // Voice setup - Initialize once
  useEffect(() => {
    const initVoice = async () => {
      try {
        // Log Firebase project alignment once on mount
        try {
          const runtimeProjectId = auth().app?.options?.projectId;
          console.log('RN Firebase projectId:', runtimeProjectId);
          console.log('Using Functions base:', `https://us-central1-${runtimeProjectId}.cloudfunctions.net`);
        } catch (_e) {}

        Voice.onSpeechStart = () => {
          console.log('Speech started');
          setIsListening(true);
        };
        
        Voice.onSpeechEnd = () => {
          console.log('Speech ended');
          setIsListening(false);
        };
        
        Voice.onSpeechResults = (e) => {
          console.log('Speech results:', e.value);
          if (e.value && e.value[0]) {
            setRetryCount(0); // Reset retry count on successful recognition
            handleUserSpeech(e.value[0]);
          }
        };
        
        Voice.onSpeechPartialResults = (e) => {
          if (e.value && e.value[0]) {
            setPartialTranscript(e.value[0]);
          }
        };
        
        Voice.onSpeechError = (e) => {
          console.log('Speech error:', e);
          setIsListening(false);
          setIsProcessing(false);
          
          // Only show error for significant issues, not for normal "no speech detected" cases
          if (!isShowingAlert.current && e.error && 
              e.error.code !== '7' && // No speech detected (normal)
              e.error.code !== '6' && // Speech timeout (normal)
              e.error.code !== '5') { // Client error (often recoverable)
            isShowingAlert.current = true;
            Alert.alert('Speech Error', 'Could not recognize speech. Please try again.', [
              { text: 'OK', onPress: () => { isShowingAlert.current = false; } }
            ]);
          }
        };

        console.log('Voice initialized successfully');
        setIsVoiceReady(true);
        isVoiceReadyRef.current = true;
      } catch (error) {
        console.log('Voice init error:', error);
        setIsVoiceReady(false);
      }
    };

    initVoice();

    // Start with greeting
    setTimeout(() => {
      const greeting = getGreeting(language);
      speakAndAddMessage(greeting, 'assistant');
    }, 500);

    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(console.log);
      setIsVoiceReady(false);
      isVoiceReadyRef.current = false;
    };
  }, []); // Run once on mount

  const handleUserSpeech = async (transcript) => {
    if (!transcript || isProcessing) return;

    setIsProcessing(true);
    setCurrentTranscript('');
    setPartialTranscript('');

    // Add user message
    const userMsg = { role: 'user', content: transcript };
    addMessage(userMsg);

    // Detect language on first message
    if (conversationHistory.current.length === 1) {
      const detected = detectLanguage(transcript);
      setLanguage(detected);
    }

    try {
      // Call Genkit in conversational mode
      const response = await callGenkitParser(
        transcript,
        null, // no fieldType
        {
          history: conversationHistory.current.slice(-10),
          eventData: eventData,
          language: language.split('-')[0]
        }
      );

      // Update event data with proper formatting
      if (response.extractedData) {
        const formattedData = formatEventData(response.extractedData);
        setEventData(prev => ({ ...prev, ...formattedData }));
      }

      // Handle schedule queries
      if (response.isScheduleQuery) {
        try {
          const todaysEvents = await GoogleCalendarService.getTodaysEvents();
          let scheduleResponse = "Here's your schedule for today:\n\n";
          
          if (todaysEvents.length === 0) {
            scheduleResponse += "You have no events scheduled for today. Enjoy your free time!";
          } else {
            todaysEvents.forEach((event, index) => {
              const startTime = moment(event.start.dateTime || event.start.date);
              const timeStr = startTime.format('h:mm A');
              const title = event.summary || 'Untitled Event';
              const location = event.location ? ` at ${event.location}` : '';
              scheduleResponse += `${index + 1}. ${timeStr} - ${title}${location}\n`;
            });
          }
          
          const scheduleMsg = { role: 'assistant', content: scheduleResponse };
          addMessage(scheduleMsg);
          
          if (Tts) {
            await Tts.speak(scheduleResponse);
          }
        } catch (error) {
          console.warn('Error fetching schedule:', error);
          const errorMsg = "Sorry, I couldn't access your calendar right now. Please try again later.";
          addMessage({ role: 'assistant', content: errorMsg });
          if (Tts) {
            await Tts.speak(errorMsg);
          }
        }
      } else if (response.isLeaveTimeQuery) {
        try {
          const leaveTimeResponse = await calculateLeaveTime();
          const leaveTimeMsg = { role: 'assistant', content: leaveTimeResponse };
          addMessage(leaveTimeMsg);
          
          if (Tts) {
            await Tts.speak(leaveTimeResponse);
          }
        } catch (error) {
          console.warn('Error calculating leave time:', error);
          const errorMsg = "Sorry, I couldn't calculate your leave time right now. Please try again later.";
          addMessage({ role: 'assistant', content: errorMsg });
          if (Tts) {
            await Tts.speak(errorMsg);
          }
        }
      } else {
        // Add assistant message
        const assistantMsg = { role: 'assistant', content: response.response };
        addMessage(assistantMsg);

        // Speak response
        if (Tts) {
          await Tts.speak(response.response);
        }

        // If confirmed or complete, navigate
        if (response.confirmed || response.isComplete) {
          setTimeout(() => {
            const formattedData = formatEventData({ ...eventData, ...response.extractedData });
            navigation.navigate('AddEvent', { 
              prefill: formattedData
            });
          }, 2000);
        }
      }

    } catch (error) {
      console.warn('Conversational parser error:', error);
      const errorMsg = "Sorry, I had trouble. Can you try again?";
      if (Tts) {
        await Tts.speak(errorMsg);
      }
      addMessage({ role: 'assistant', content: errorMsg });
    }

    setIsProcessing(false);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    
    const transcript = textInput.trim();
    setTextInput('');
    setIsProcessing(true);
    
    // Add user message
    const userMsg = { role: 'user', content: transcript };
    addMessage(userMsg);
    
    // Detect language on first message
    if (conversationHistory.current.length === 1) {
      const detected = detectLanguage(transcript);
      setLanguage(detected);
    }

    try {
      // Call Genkit in conversational mode
      const response = await callGenkitParser(
        transcript,
        null, // no fieldType
        {
          history: conversationHistory.current.slice(-10),
          eventData: eventData,
          language: language.split('-')[0]
        }
      );

      // Update event data with proper formatting
      if (response.extractedData) {
        const formattedData = formatEventData(response.extractedData);
        setEventData(prev => ({ ...prev, ...formattedData }));
      }

      // Handle schedule queries
      if (response.isScheduleQuery) {
        try {
          const todaysEvents = await GoogleCalendarService.getTodaysEvents();
          let scheduleResponse = "Here's your schedule for today:\n\n";
          
          if (todaysEvents.length === 0) {
            scheduleResponse += "You have no events scheduled for today. Enjoy your free time!";
          } else {
            todaysEvents.forEach((event, index) => {
              const startTime = moment(event.start.dateTime || event.start.date);
              const timeStr = startTime.format('h:mm A');
              const title = event.summary || 'Untitled Event';
              const location = event.location ? ` at ${event.location}` : '';
              scheduleResponse += `${index + 1}. ${timeStr} - ${title}${location}\n`;
            });
          }
          
          const scheduleMsg = { role: 'assistant', content: scheduleResponse };
          addMessage(scheduleMsg);
        } catch (error) {
          console.warn('Error fetching schedule:', error);
          const errorMsg = "Sorry, I couldn't access your calendar right now. Please try again later.";
          addMessage({ role: 'assistant', content: errorMsg });
        }
      } else if (response.isLeaveTimeQuery) {
        try {
          const leaveTimeResponse = await calculateLeaveTime();
          const leaveTimeMsg = { role: 'assistant', content: leaveTimeResponse };
          addMessage(leaveTimeMsg);
        } catch (error) {
          console.warn('Error calculating leave time:', error);
          const errorMsg = "Sorry, I couldn't calculate your leave time right now. Please try again later.";
          addMessage({ role: 'assistant', content: errorMsg });
        }
      } else {
        // Add assistant message
        const assistantMsg = { role: 'assistant', content: response.response };
        addMessage(assistantMsg);

        // If confirmed or complete, navigate
        if (response.confirmed || response.isComplete) {
          setTimeout(() => {
            const formattedData = formatEventData({ ...eventData, ...response.extractedData });
            navigation.navigate('AddEvent', { 
              prefill: formattedData
            });
          }, 2000);
        }
      }

    } catch (error) {
      console.warn('Conversational parser error:', error);
      const errorMsg = "Sorry, I had trouble. Can you try again?";
      addMessage({ role: 'assistant', content: errorMsg });
    }

    setIsProcessing(false);
  };

  const addMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
    conversationHistory.current.push(msg);
    
    // Auto-scroll to bottom after a short delay
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const speakAndAddMessage = async (text, role) => {
    addMessage({ role, content: text });
    if (role === 'assistant' && Tts) {
      await Tts.speak(text);
    }
  };

// Enhanced AI parser with conversational mode support
async function callGenkitParser(transcript, fieldType = null, conversationalOptions = null) {
  const projectId = auth().app?.options?.projectId;
  const url = `https://us-central1-${projectId}.cloudfunctions.net/parseEventWithGenkitV2`;
  
  // Public HTTP function; do not send Authorization to avoid 401 if the service expects Google-signed tokens
  let headers = { 'Content-Type': 'application/json' };

  let body = { text: transcript };
  
  // If conversational mode
  if (conversationalOptions) {
    body = {
      text: transcript,
      conversationMode: true,
      conversationHistory: conversationalOptions.history || [],
      currentEventData: conversationalOptions.eventData || {},
      userLanguage: conversationalOptions.language || 'en'
    };
  }
  // If field-specific parsing
  else if (fieldType) {
    body.fieldType = fieldType;
    body.instructions = {
      title: 'Extract only the event title...',
      location: 'Extract only the location...',
      description: 'Extract meaningful details...'
    }[fieldType];
  }

  const resp = await fetch(url, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(body) 
  });
  
  if (!resp.ok) {
    let errorText = '';
    try { errorText = await resp.text(); } catch (_e) { errorText = '<no body>'; }
    console.warn('Genkit parser HTTP error', { status: resp.status, body: errorText });
    // Return a safe fallback to keep UI responsive
    if (conversationalOptions) {
      return {
        response: "Sorry, I'm having trouble right now. Could you try again?",
        extractedData: {},
        isComplete: false,
        needsConfirmation: false,
        confirmed: false,
        error: true,
        status: resp.status
      };
    }
    if (fieldType) {
      return { value: transcript };
    }
    return { title: '', date: '', time: '', location: '', description: '' };
  }
  return await resp.json();
}


  const startVoice = async () => {
    console.log('Starting voice recognition...');

    // Check permissions first
    const ok = await requestMicPermission();
    if (!ok) {
      Alert.alert(
        'Permission Required',
        'Please enable microphone access in Settings to use voice input.',
        [
          {
            text: 'Cancel',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }

    try {
      // Cleanup any existing session
      try {
        await Voice.cancel();
        await Voice.stop();
        await Voice.destroy();
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.log('Cleanup error (safe to ignore):', e);
      }

      // Reset UI state
      setCurrentTranscript('');
      setPartialTranscript('');

      // Start voice recognition with improved configuration
      console.log('Starting voice with language:', language);
      await Voice.start(language, {
        // Android specific options
        'android.speech.extra.PARTIAL_RESULTS': true,
        'android.speech.extra.MAX_RESULTS': 5,
        'android.speech.extra.CONFIDENCE_SCORES': true,
        // iOS specific options
        'ios.speech.recognitionRequestShouldReportPartialResults': true,
        'ios.speech.recognitionRequestRequiresOnDeviceRecognition': false,
      });
      console.log('Voice started successfully');

    } catch (error) {
      console.log('Voice start error:', error);
      setIsListening(false);
      
      let errorMsg = 'Could not start voice recognition. Please try again.';
      
      if (error.code === '9') {
        errorMsg = 'Microphone permission denied. Please enable microphone access in settings.';
      } else if (error.code === '5') {
        errorMsg = 'Microphone is in use. Please close other apps using the microphone and try again.';
      }

      Alert.alert('Voice Error', errorMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => {
          if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            // Wait a moment before retrying
            setTimeout(() => startVoice(), 1000);
          } else {
            Alert.alert('Too Many Retries', 'Please check your microphone and try again later.');
            setRetryCount(0);
          }
        }}
      ]);
    }
  };

  const stopVoice = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.log('Voice stop error:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={getDynamicBackground()} style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Assistant</Text>
        <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.historyButton}>
          <Icon name="history" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.center}>
        {/* Conversation Messages - Now takes more space */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.conversationScrollView} 
          contentContainerStyle={styles.conversationContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Mic Visual and Status - Only show when no messages */}
          {messages.length === 0 && (
            <View style={styles.initialStateContainer}>
              <View style={styles.micContainer}>
                <Icon 
                  name={isListening ? 'mic' : 'mic-off'} 
                  size={80} 
                  color="#fff" 
                  style={isListening ? styles.pulsingMic : null}
                />
              </View>
              
              <Text style={styles.statusText}>
                {!isVoiceReady ? 'Initializing...' :
                 isSpeaking ? 'Speaking...' :
                 isProcessing ? 'Processing...' :
                 isListening ? 'Listening...' :
                 'Ready'}
              </Text>
            </View>
          )}

          {messages.length === 0 ? (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsText}>
                Try saying something like:
              </Text>
              <Text style={styles.exampleText}>
                "Meeting tomorrow at 3 PM"
              </Text>
              <Text style={styles.exampleText}>
                "Appointment with Dr. Smith on Friday at 10 AM"
              </Text>
            </View>
          ) : (
            messages.map((msg, index) => (
              <View 
                key={index} 
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble
                ]}
              >
                <Text style={styles.messageText}>{msg.content}</Text>
              </View>
            ))
          )}
          
          {/* Show partial transcript while user is speaking */}
          {partialTranscript && (
            <View style={[styles.messageBubble, styles.userBubble, styles.partialBubble]}>
              <Text style={[styles.messageText, styles.partialText]}>{partialTranscript}</Text>
            </View>
          )}
        </ScrollView>

        {/* Event Preview - Collapsible */}
        {Object.keys(eventData).length > 0 && (
          <View style={styles.eventPreview}>
            <TouchableOpacity 
              style={styles.eventPreviewHeader}
              onPress={() => setIsEventPreviewMinimized(!isEventPreviewMinimized)}
            >
              <Text style={styles.eventPreviewTitle}>Event Preview:</Text>
              <Icon 
                name={isEventPreviewMinimized ? 'keyboard-arrow-down' : 'keyboard-arrow-up'} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            {!isEventPreviewMinimized && (
              <View style={styles.eventPreviewContent}>
                {eventData.title && <Text style={styles.eventPreviewText}>📌 {eventData.title}</Text>}
                {eventData.date && <Text style={styles.eventPreviewText}>📅 {eventData.date}</Text>}
                {eventData.time && <Text style={styles.eventPreviewText}>⏰ {eventData.time}</Text>}
                {eventData.location && <Text style={styles.eventPreviewText}>📍 {eventData.location}</Text>}
                
                {/* Create Event Button */}
                {eventData.title && eventData.date && eventData.time && (
                  <TouchableOpacity 
                    style={styles.createEventButton}
                    onPress={() => {
                  const formattedData = formatEventData(eventData);
                  navigation.navigate('AddEvent', { 
                    prefill: formattedData
                  });
                }}
              >
                <Icon name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.createEventButtonText}>Create Event</Text>
              </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Speech Tips */}
        {retryCount > 0 && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Speech Recognition Tips:</Text>
            <Text style={styles.tipsText}>• Speak clearly and at normal pace</Text>
            <Text style={styles.tipsText}>• Reduce background noise</Text>
            <Text style={styles.tipsText}>• Hold phone 6-12 inches from your mouth</Text>
            <Text style={styles.tipsText}>• Try speaking in shorter phrases</Text>
          </View>
        )}

        {/* Input Mode Toggle */}
        <View style={styles.inputModeContainer}>
            <TouchableOpacity 
              style={[styles.modeButton, inputMode === 'voice' && styles.activeModeButton]}
              onPress={() => setInputMode('voice')}
            >
              <Icon name="mic" size={20} color={inputMode === 'voice' ? '#667eea' : '#fff'} />
              <Text style={[styles.modeButtonText, inputMode === 'voice' && styles.activeModeButtonText]}>Voice</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeButton, inputMode === 'text' && styles.activeModeButton]}
              onPress={() => setInputMode('text')}
            >
              <Icon name="keyboard" size={20} color={inputMode === 'text' ? '#667eea' : '#fff'} />
              <Text style={[styles.modeButtonText, inputMode === 'text' && styles.activeModeButtonText]}>Text</Text>
            </TouchableOpacity>
          </View>

          {/* Text Input */}
          {inputMode === 'text' && (
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Type your message here..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, !textInput.trim() && styles.sendButtonDisabled]}
                onPress={handleTextSubmit}
                disabled={!textInput.trim() || isProcessing}
              >
                <Icon name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Mic Button - Only show in voice mode */}
          {inputMode === 'voice' && (
            <View style={styles.buttonContainer}>
              {!isVoiceReady ? (
                <View style={styles.processingContainer}>
                  <Icon name="sync" size={24} color="#fff" style={styles.spinningIcon} />
                  <Text style={styles.processingText}>Initializing...</Text>
                </View>
              ) : !isListening && !isProcessing ? (
                <TouchableOpacity style={styles.button} onPress={startVoice}>
                  <Icon name="mic" size={24} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Speak</Text>
                </TouchableOpacity>
              ) : isListening ? (
                <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopVoice}>
                  <Icon name="stop" size={24} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Stop</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.processingContainer}>
                  <Icon name="sync" size={24} color="#fff" style={styles.spinningIcon} />
                  <Text style={styles.processingText}>Processing...</Text>
                </View>
              )}
            </View>
          )}
      </View>

      {/* Chat History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.closeButton}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.historyList}>
              <TouchableOpacity 
                style={styles.newChatButton}
                onPress={startNewConversation}
              >
                <Icon name="add" size={20} color="#667eea" />
                <Text style={styles.newChatText}>Start New Chat</Text>
              </TouchableOpacity>
              
              {chatHistory.map((conversation) => (
                <TouchableOpacity
                  key={conversation.id}
                  style={styles.historyItem}
                  onPress={() => loadConversation(conversation)}
                >
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {conversation.title}
                    </Text>
                    <Text style={styles.historyTime}>
                      {moment(conversation.timestamp).format('MMM D, h:mm A')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>
              ))}
              
              {chatHistory.length === 0 && (
                <View style={styles.emptyHistory}>
                  <Icon name="chat" size={48} color="#ccc" />
                  <Text style={styles.emptyHistoryText}>No previous conversations</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  center: { 
    flex: 1, 
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  micContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  pulsingMic: {
    // Animation would be added here
  },
  statusText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  conversationScrollView: {
    flex: 1,
    width: '100%',
    marginBottom: 10,
  },
  conversationContent: {
    paddingVertical: 10,
  },
  initialStateContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 15,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderBottomLeftRadius: 4,
  },
  partialBubble: {
    opacity: 0.7,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  partialText: {
    fontStyle: 'italic',
  },
  eventPreview: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    width: '100%',
    marginBottom: 15,
  },
  eventPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingBottom: 10,
  },
  eventPreviewTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventPreviewContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  eventPreviewText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  instructionsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  exampleText: {
    color: '#fff',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 5,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  button: { 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    paddingHorizontal: 30, 
    paddingVertical: 15, 
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  stopButton: {
    backgroundColor: 'rgba(255,107,107,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
  },
  processingText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  spinningIcon: {
    // Animation would be added here
  },
  createEventButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createEventButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tipsTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  tipsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  inputModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  activeModeButton: {
    backgroundColor: '#fff',
  },
  modeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  activeModeButtonText: {
    color: '#667eea',
  },
  textInputContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  historyButton: {
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  newChatText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});

export default VoiceEventScreen;


