/**
 * TURN Credential Service
 * Fetches fresh TURN server credentials from various providers
 */
class TurnCredentialService {
  constructor() {
    this.meteredApiKey = '201d0c94e4f084221fc15e27e920e7a34c77';
    this.cachedCredentials = null;
    this.cacheExpiry = null;
  }

  /**
   * Fetch fresh credentials from Metered/Open Relay Project
   */
  async fetchMeteredCredentials() {
    try {
      const response = await fetch(
        `https://tarteel.metered.live/api/v1/turn/credentials?apiKey=${this.meteredApiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const credentials = await response.json();
        serverCount: credentials.length,
        expires: new Date(Date.now() + 3600 * 1000).toISOString()
      });
      
      return credentials;
    } catch (error) {
      console.error('❌ Failed to fetch Metered credentials:', error);
      return null;
    }
  }

  /**
   * Get TURN credentials with caching (1 hour cache)
   */
  async getCredentials() {
    // Check if cached credentials are still valid
    if (this.cachedCredentials && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedCredentials;
    }

    // Try to fetch fresh credentials
    const freshCredentials = await this.fetchMeteredCredentials();
    
    if (freshCredentials) {
      this.cachedCredentials = freshCredentials;
      this.cacheExpiry = Date.now() + (3600 * 1000); // 1 hour
      return freshCredentials;
    }

    // Fallback to static credentials
    return this.getStaticCredentials();
  }

  /**
   * Static fallback credentials
   */
  getStaticCredentials() {
    return [
      // Open Relay Project static credentials
      {
        urls: [
          'turn:a.relay.metered.ca:80',
          'turn:a.relay.metered.ca:80?transport=tcp',
          'turn:a.relay.metered.ca:443',
          'turn:a.relay.metered.ca:443?transport=tcp'
        ],
        username: 'fa53f8f14f3c6de0d0793e47',
        credential: 'wrzi7cWJQrK+sHMG'
      },
      // ExpressTURN fallback
      {
        urls: [
          'turn:relay1.expressturn.com:3480',
          'turn:relay1.expressturn.com:3481',
          'turns:relay1.expressturn.com:5349'
        ],
        username: '000000002071384242',
        credential: 'ylUJHZNJZ4HPdvPzrIt4WVwEfSM='
      }
    ];
  }
}

export default TurnCredentialService;