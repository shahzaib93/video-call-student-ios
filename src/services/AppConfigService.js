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
  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    console.warn('App config document not found in Firestore, using defaults');
    return null;
  }
  const data = snapshot.data() || {};
  return {
    ...data,
    updatedAt: data.updatedAt || data.lastUpdated || null
  };
}

export const initializeAppConfig = async ({ listen = true } = {}) => {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const firestoreConfig = await fetchConfigFromFirestore();
        if (firestoreConfig) {
          applyConfig(firestoreConfig);
        } else {
          const cached = loadConfigFromCache();
          if (cached) {
            applyConfig(cached);
          } else {
            applyConfig(getDefaultEnvironmentConfig());
          }
        }
      } catch (error) {
        console.error('Failed to load app config from Firestore:', error);
        const cached = loadConfigFromCache();
        if (cached) {
          applyConfig(cached);
        } else {
          applyConfig(getDefaultEnvironmentConfig());
        }
      }

      if (listen && !unsubscribe) {
        const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT);
        unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() || {};
            applyConfig({
              ...data,
              updatedAt: data.updatedAt || data.lastUpdated || null
            });
          }
        }, (error) => {
          console.error('App config snapshot listener error:', error);
        });
      }

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
