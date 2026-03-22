// lib/onedrive-token.js
import fs from 'fs';
import path from 'path';

class OneDriveTokenManager {
  constructor() {
    this.tokenFile = path.join(process.cwd(), 'config', 'onedrive-tokens.json');
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.tenantId = process.env.TENANT_ID;
    
    // In-memory token storage for serverless environments
    this.memoryTokens = null;
  }

  // Read tokens from file or memory
  getStoredTokens() {
    // First try memory storage
    if (this.memoryTokens) {
      return this.memoryTokens;
    }

    // Then try file system (local development)
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8');
        const tokens = JSON.parse(data);
        this.memoryTokens = tokens; // Cache in memory
        return tokens;
      }
    } catch (error) {
      console.log('File system not available, using memory storage (production mode)');
    }
    return null;
  }

  // Save tokens to file and memory
  saveTokens(tokens) {
    // Store in memory for serverless environments
    this.memoryTokens = tokens;
    
    // Try to save to file if possible (local development)
    try {
      const dir = path.dirname(this.tokenFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2));
    } catch (error) {
      // File system not available (like in Vercel), use memory storage
      console.log('Using in-memory token storage (production mode)');
    }
  }

  // Check if token is expired (with 5 minute buffer)
  isTokenExpired(tokens) {
    if (!tokens || !tokens.expires_at) return true;
    const now = Date.now();
    const expiryTime = tokens.expires_at;
    return now >= (expiryTime - 5 * 60 * 1000); // 5 minute buffer
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken) {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      
      // Calculate expiry time
      const expiresAt = Date.now() + (data.expires_in * 1000);
      
      const tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken, // Use new refresh token if provided
        expires_in: data.expires_in,
        expires_at: expiresAt,
        token_type: data.token_type,
        updated_at: new Date().toISOString()
      };

      this.saveTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  // Get valid access token (refresh if needed or generate new)
  async getValidAccessToken() {
    let tokens = this.getStoredTokens();
    
    // If no tokens exist or token is expired, generate new ones
    if (!tokens || this.isTokenExpired(tokens)) {
      console.log('No valid tokens found, generating new ones...');
      tokens = await this.getInitialTokens();
    }

    // If we have refresh token and token is expired, try to refresh
    if (tokens.refresh_token && this.isTokenExpired(tokens)) {
      console.log('Token expired, refreshing...');
      try {
        tokens = await this.refreshAccessToken(tokens.refresh_token);
      } catch (error) {
        // If refresh fails, get new tokens
        console.log('Refresh failed, getting new tokens...');
        tokens = await this.getInitialTokens();
      }
    }

    return tokens.access_token;
  }

  // Initial setup - get tokens using client credentials flow
  async getInitialTokens() {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Initial token request failed: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      
      const expiresAt = Date.now() + (data.expires_in * 1000);
      
      const tokens = {
        access_token: data.access_token,
        expires_in: data.expires_in,
        expires_at: expiresAt,
        token_type: data.token_type,
        created_at: new Date().toISOString()
      };

      this.saveTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting initial tokens:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tokenManager = new OneDriveTokenManager();

// Updated OneDrive download function
export async function getOneDriveDownloadUrl(sharedUrl, accessToken = null) {
  try {
    // Use provided token or get fresh one
    const token = accessToken || await tokenManager.getValidAccessToken();
    
    const response = await fetch("https://graph.microsoft.com/v1.0/shares/u!" + 
      Buffer.from(sharedUrl).toString('base64').replace(/\//g, '_').replace(/\+/g, '-') + 
      "/driveItem", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // If token is invalid, try to refresh and retry once
      if (response.status === 401 && !accessToken) {
        console.log('Access denied, attempting token refresh...');
        const newToken = await tokenManager.getValidAccessToken();
        return getOneDriveDownloadUrl(sharedUrl, newToken);
      }
      throw new Error(`Failed to fetch download URL: ${response.status}`);
    }

    const json = await response.json();
    return json['@microsoft.graph.downloadUrl'];
  } catch (error) {
    console.error('Error getting OneDrive download URL:', error);
    throw error;
  }
}

// Setup script (run this once to get initial tokens)
export async function setupOneDriveTokens() {
  try {
    const tokens = await tokenManager.getInitialTokens();
    console.log('✅ OneDrive tokens setup successfully');
    console.log('Token expires at:', new Date(tokens.expires_at).toISOString());
    return tokens;
  } catch (error) {
    console.error('❌ Failed to setup OneDrive tokens:', error);
    throw error;
  }
}