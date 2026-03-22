// scripts/setup-onedrive.mjs (ES Module version)
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

class OneDriveTokenManager {
  constructor() {
    this.tokenFile = path.join(process.cwd(), 'config', 'onedrive-tokens.json');
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.tenantId = process.env.TENANT_ID;
  }

  saveTokens(tokens) {
    try {
      const dir = path.dirname(this.tokenFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

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

async function setupOneDriveTokens() {
  try {
    const tokenManager = new OneDriveTokenManager();
    
    // Validate environment variables
    if (!tokenManager.clientId || !tokenManager.clientSecret || !tokenManager.tenantId) {
      throw new Error('Missing required environment variables. Please check your .env.local file:\n' +
        '- CLIENT_ID\n' +
        '- CLIENT_SECRET\n' +
        '- TENANT_ID');
    }
    
    console.log('🔄 Setting up OneDrive tokens...');
    console.log(`Client ID: ${tokenManager.clientId}`);
    console.log(`Tenant ID: ${tokenManager.tenantId}`);
    
    const tokens = await tokenManager.getInitialTokens();
    
    console.log('✅ OneDrive tokens setup successfully!');
    console.log(`📁 Tokens saved to: ${tokenManager.tokenFile}`);
    console.log(`⏰ Token expires at: ${new Date(tokens.expires_at).toISOString()}`);
    console.log('🎉 Your app will now automatically refresh tokens as needed.');
    
    return tokens;
  } catch (error) {
    console.error('❌ Failed to setup OneDrive tokens:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupOneDriveTokens();