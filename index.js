// Entry point wrapper to ensure required polyfills are loaded
// before expo-router (and any routes importing mqtt) are evaluated.
import './polyfills';

export { default } from 'expo-router/entry';

