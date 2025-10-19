import { Capacitor } from '@capacitor/core';
import { getAppConfig } from './AppConfigService';
import { API_BASE_URL } from '../config/environment';

const CALL_NOTIFICATION_CHANNEL = 'incoming-call-alerts';

class PushNotificationService extends EventTarget {
  constructor() {
    super();
    this.initialized = false;
    this.currentToken = null;
    this.user = null;
    this.baseUrl = null;
    this.listeners = [];
    this.lastInviteId = null;
    this.pushPlugin = createPushNotificationsStub();
    this.localPlugin = createLocalNotificationsStub();
    this.pluginsLoaded = false;
    this.lastNotificationId = null;
  }

  async initialize(user) {
    if (!Capacitor.isNativePlatform()) {
      console.info('📵 Push notifications are only available on native builds; skipping registration.');
      return;
    }

    if (this.initialized && this.user?.id === user?.id) {
      return;
    }

    await this.ensurePluginsLoaded();

    this.user = user;
    const config = getAppConfig();
    const configuredBase = (config?.apiBaseUrl || API_BASE_URL || '').replace(/\/$/, '');
    this.baseUrl = configuredBase.replace(/\/api$/, '') || null;

    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      console.warn('⚠️ Push notifications permission not granted. Call notifications will rely on foreground socket only.');
      return;
    }

    await this.ensureNotificationChannel();
    await this.attachListeners();

    try {
      await this.pushPlugin.register();
      this.initialized = true;
      console.log('✅ Push notifications registration requested');
    } catch (error) {
      console.error('❌ Failed to register for push notifications:', error);
    }
  }

  async ensurePermissions() {
    try {
      const localStatus = await this.localPlugin.checkPermissions();
      if (localStatus.display !== 'granted') {
        const request = await this.localPlugin.requestPermissions();
        if (request.display !== 'granted') {
          console.warn('⚠️ Local notification permission denied');
          return false;
        }
      }

      const status = await this.pushPlugin.checkPermissions();
      if (status.receive === 'granted') {
        return true;
      }

      const request = await this.pushPlugin.requestPermissions();
      return request.receive === 'granted';
    } catch (error) {
      console.error('❌ Failed to verify push notification permissions:', error);
      return false;
    }
  }

  async ensureNotificationChannel() {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      await this.localPlugin.createChannel({
        id: CALL_NOTIFICATION_CHANNEL,
        name: 'Incoming Calls',
        description: 'Alerts for teacher calls',
        sound: 'default',
        importance: 5,
        visibility: 1,
        lights: true,
        vibration: true,
      });
    } catch (error) {
      console.warn('⚠️ Failed to create Android notification channel:', error);
    }
  }

  async attachListeners() {
    if (this.listeners.length > 0) {
      return;
    }

    const registrationListener = await this.pushPlugin.addListener('registration', (token) => {
      this.handleRegistration(token).catch((error) => {
        console.error('❌ Failed to handle push registration:', error);
      });
    });

    const errorListener = await this.pushPlugin.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error);
    });

    const receiveListener = await this.pushPlugin.addListener('pushNotificationReceived', (notification) => {
      this.handleNotification(notification).catch((err) => {
        console.error('❌ Failed to process incoming push notification:', err);
      });
    });

    const actionListener = await this.pushPlugin.addListener('pushNotificationActionPerformed', (event) => {
      this.handleNotificationAction(event).catch((err) => {
        console.error('❌ Failed to handle notification action:', err);
      });
    });

    this.listeners.push(registrationListener, errorListener, receiveListener, actionListener);
  }

  async handleRegistration(token) {
    const tokenValue = token?.value || token?.token || token;
    if (!tokenValue) {
      console.warn('⚠️ Received empty push token');
      return;
    }

    this.currentToken = tokenValue;
    if (!this.user || !this.baseUrl) {
      console.warn('⚠️ Cannot sync push token yet. Missing user or API base URL.');
      return;
    }

    try {
      const payload = {
        userId: this.user.id,
        role: this.user.role,
        token: tokenValue,
        platform: Capacitor.getPlatform(),
        app: 'student',
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Registration failed: ${response.status} ${text}`);
      }

      console.log('✅ Push token registered with signaling server');
    } catch (error) {
      console.error('❌ Failed to sync push token with backend:', error);
    }
  }

  async handleNotification(notification) {
    const data = notification?.data || {};
    if (data.type !== 'call_invite') {
      return;
    }

    if (data.callId && data.callId === this.lastInviteId) {
      return;
    }

    this.lastInviteId = data.callId || null;

    try {
      const notificationId = Date.now() % 100000;
      await this.localPlugin.schedule({
        notifications: [
          {
            id: notificationId,
            title: data.title || 'Incoming call',
            body: data.body || `${data.callerName || 'Teacher'} is calling you`,
            extra: data,
            channelId: CALL_NOTIFICATION_CHANNEL,
            sound: 'default',
            schedule: {
              at: new Date(Date.now() + 250)
            }
          }
        ]
      });

      this.lastNotificationId = notificationId;
    } catch (error) {
      console.error('❌ Failed to schedule local notification:', error);
    }

    this.dispatchEvent(new CustomEvent('call-invite', { detail: data }));
  }

  async handleNotificationAction(event) {
    const data = event?.notification?.data || event?.notification?.extra || {};
    if (data.type !== 'call_invite') {
      return;
    }

    this.dispatchEvent(new CustomEvent('call-invite-action', { detail: data }));
  }

  async clear() {
    this.user = null;
    this.currentToken = null;
    this.baseUrl = null;
    this.lastInviteId = null;
    this.initialized = false;

    await Promise.all(
      this.listeners.map(async (listener) => {
        try {
          await listener.remove();
        } catch (error) {
          console.warn('⚠️ Failed to remove push listener:', error);
        }
      })
    );

    this.listeners = [];
    this.pushPlugin = createPushNotificationsStub();
    this.localPlugin = createLocalNotificationsStub();
    this.pluginsLoaded = false;
    this.lastNotificationId = null;
  }

  async dismissLastInvite() {
    if (!this.lastNotificationId) {
      return;
    }

    try {
      await this.ensurePluginsLoaded();
      await this.localPlugin.cancel({
        notifications: [{ id: this.lastNotificationId }]
      });
    } catch (error) {
      console.warn('⚠️ Failed to cancel local notification:', error);
    }

    this.lastNotificationId = null;
  }

  async ensurePluginsLoaded() {
    if (this.pluginsLoaded) {
      return;
    }

    try {
      const [{ PushNotifications }, { LocalNotifications }] = await Promise.all([
        import('@capacitor/push-notifications'),
        import('@capacitor/local-notifications')
      ]);
      this.pushPlugin = PushNotifications;
      this.localPlugin = LocalNotifications;
      this.pluginsLoaded = true;
    } catch (error) {
      console.error('❌ Failed to load Capacitor notification plugins:', error);
      this.pushPlugin = createPushNotificationsStub();
      this.localPlugin = createLocalNotificationsStub();
      this.pluginsLoaded = false;
    }
  }
}

export default new PushNotificationService();

function createPushNotificationsStub() {
  return {
    async addListener() {
      return { remove: async () => {} };
    },
    async register() {
      return undefined;
    },
    async checkPermissions() {
      return { receive: 'denied' };
    },
    async requestPermissions() {
      return { receive: 'denied' };
    }
  };
}

function createLocalNotificationsStub() {
  return {
    async checkPermissions() {
      return { display: 'granted' };
    },
    async requestPermissions() {
      return { display: 'granted' };
    },
    async createChannel() {
      return undefined;
    },
    async schedule() {
      return undefined;
    }
  };
}
