// Polyfills needed for mqtt.js on React Native (especially in release builds).
// Must be imported before any `mqtt` import runs.

import { Buffer } from 'buffer';

// Buffer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;
if (!g.Buffer) g.Buffer = Buffer;

// process
// mqtt (and its deps) often expect `process.nextTick` and friends.
if (!g.process) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  g.process = require('process');
}

// URL / URLSearchParams (used by websocket/url parsing in some stacks)
// eslint-disable-next-line import/no-unassigned-import
import 'react-native-url-polyfill/auto';

