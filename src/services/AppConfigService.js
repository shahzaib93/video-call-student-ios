import { db } from '../config/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { setEnvironmentConfig, getDefaultEnvironmentConfig } from '../config/environment';

const CONFIG_COLLECTION = 'appConfig';
const CONFIG_DOCUMENT = 'webrtc';
const CACHE_KEY = 'student-app-config';

let currentConfig = buildConfig();
let loadPromise = null;
let unsubscribe = null;
const listeners = new Set();

function buildConfig(partial = {}) {
  const defaults = getDefaultEnvironmentConfig();
  const turn = normalizeTurnConfig(partial.turn || partial.turnConfig || partial.turnServer);

  return {
    apiBaseUrl: partial.apiBaseUrl || partial.apiUrl || defaults.apiBaseUrl,
    socketUrl: partial.socketUrl || partial.signalingUrl || defaults.socketUrl,
    appEnv: partial.appEnv || partial.environment || defaults.appEnv,
    turn,
    updatedAt: partial.updatedAt || null
  };
}

function normalizeTurnConfig(turn) {
  if (!turn) {
    return null;
  }

  if (Array.isArray(turn)) {
    const [first] = turn;
    return normalizeTurnConfig(first);
  }

  const {
    host,
    port,
    username,
    credential,
    password,
    urls
  } = turn;

  const normalizedUrls = Array.isArray(urls)
    ? urls
    : (typeof urls === 'string' ? [urls] : []);

  return {
    host: host || null,
    port: port || 3478,
    username: username || turn.user || null,
    credential: credential || password || null,
    urls: normalizedUrls
  };
}

function applyConfig(config) {
  currentConfig = buildConfig(config);
  setEnvironmentConfig({
    apiBaseUrl: currentConfig.apiBaseUrl,
    socketUrl: currentConfig.socketUrl,
    appEnv: currentConfig.appEnv
  });
  cacheConfig(currentConfig);
  listeners.forEach((callback) => {
    try {
      callback(currentConfig);
    } catch (error) {
      console.error('AppConfig listener failed:', error);
    }
  });
}

function cacheConfig(config) {
  try {
    const payload = {
      config,
      cachedAt: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to cache app config:', error);
  }
}

function loadConfigFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.config) {
      return parsed.config;
    }
  } catch (error) {
    console.warn('Failed to parse cached app config:', error);
  }
  return null;
}

async function fetchConfigFromFirestore() {
  console.log('📡 Fetching app config from Firestore...');
  try {
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT);
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore fetch timeout (10s)')), 10000)
    );
    const fetchPromise = getDoc(docRef);

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (!snapshot.exists()) {
      console.warn('⚠️ App config document not found in Firestore, using defaults');
      return null;
    }
    const data = snapshot.data() || {};
    console.log('✅ App config loaded from Firestore');
    return {
      ...data,
      updatedAt: data.updatedAt || data.lastUpdated || null
    };
  } catch (error) {
    console.error('❌ Failed to fetch app config from Firestore:', error);
    throw error;
  }
}

export const initializeAppConfig = async ({ listen = true } = {}) => {
  if (!loadPromise) {
    loadPromise = (async () => {
      console.log('🔧 Initializing app config...');
      try {
        const firestoreConfig = await fetchConfigFromFirestore();
        if (firestoreConfig) {
          console.log('✅ Using Firestore config');
          applyConfig(firestoreConfig);
        } else {
          const cached = loadConfigFromCache();
          if (cached) {
            console.log('📦 Using cached config');
            applyConfig(cached);
          } else {
            console.log('⚙️ Using default config');
            applyConfig(getDefaultEnvironmentConfig());
          }
        }
      } catch (error) {
        console.error('❌ Failed to load app config from Firestore:', error);
        const cached = loadConfigFromCache();
        if (cached) {
          console.log('📦 Falling back to cached config');
          applyConfig(cached);
        } else {
          console.log('⚙️ Falling back to default config');
          applyConfig(getDefaultEnvironmentConfig());
        }
      }

      if (listen && !unsubscribe) {
        try {
          const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT);
          unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() || {};
              console.log('🔄 App config updated from Firestore');
              applyConfig({
                ...data,
                updatedAt: data.updatedAt || data.lastUpdated || null
              });
            }
          }, (error) => {
            console.error('❌ App config snapshot listener error:', error);
          });
          console.log('👂 Listening for app config changes');
        } catch (error) {
          console.error('❌ Failed to set up config listener:', error);
        }
      }

      console.log('✅ App config initialization complete');
      return currentConfig;
    })();
  }

  return loadPromise;
};

export const getAppConfig = () => currentConfig;

export const onAppConfigChange = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const disposeAppConfig = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  listeners.clear();
  loadPromise = null;
};

export default {
  initialize: initializeAppConfig,
  getConfig: getAppConfig,
  onChange: onAppConfigChange,
  dispose: disposeAppConfig
};
