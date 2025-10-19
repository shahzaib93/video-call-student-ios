// Environment configuration for Student mobile/web app

const DEFAULT_CONFIG = {
  apiBaseUrl: 'http://192.95.33.150:5003/api',
  socketUrl: 'http://192.95.33.150:5003',
  appEnv: 'production'
};

export const getDefaultEnvironmentConfig = () => ({
  apiBaseUrl: DEFAULT_CONFIG.apiBaseUrl,
  socketUrl: DEFAULT_CONFIG.socketUrl,
  appEnv: DEFAULT_CONFIG.appEnv
});

export let API_BASE_URL = DEFAULT_CONFIG.apiBaseUrl;
export let SOCKET_URL = DEFAULT_CONFIG.socketUrl;
export let APP_ENV = DEFAULT_CONFIG.appEnv;

export const setEnvironmentConfig = ({ apiBaseUrl, socketUrl, appEnv } = {}) => {
  API_BASE_URL = apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl;
  SOCKET_URL = socketUrl || DEFAULT_CONFIG.socketUrl;
  APP_ENV = appEnv || DEFAULT_CONFIG.appEnv;
};

export default {
  get API_BASE_URL() {
    return API_BASE_URL;
  },
  get SOCKET_URL() {
    return SOCKET_URL;
  },
  get APP_ENV() {
    return APP_ENV;
  },
  get isProduction() {
    return APP_ENV === 'production';
  },
  get isDevelopment() {
    return APP_ENV === 'development';
  },
  get isStaging() {
    return APP_ENV === 'staging';
  }
};
