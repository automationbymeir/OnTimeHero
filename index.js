/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Suppress known warnings from @react-native-voice/voice library
// This is a known issue with the library and React Native 0.72+
LogBox.ignoreLogs([
  'new NativeEventEmitter was called with a non-null argument',
  'new NativeEventEmitter()',
  'EventEmitter.removeListener',
  'removeListeners',
]);

// Also suppress console warnings for NativeEventEmitter
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0]?.includes?.('new NativeEventEmitter') ||
    args[0]?.includes?.('removeListeners')
  ) {
    return;
  }
  originalWarn(...args);
};

AppRegistry.registerComponent(appName, () => App);
