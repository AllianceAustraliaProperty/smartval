/**
 * Security Configuration
 * Contains all security-related settings and constants
 */

// Environment-based configuration
export const SECURITY_CONFIG = {
  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || 'your-super-secure-secret-key-change-this-in-production',
    EXPIRES_IN: '7d',
    ALGORITHM: 'HS256' as const,
    ISSUER: 'val-ai',
    AUDIENCE: 'val-ai-users',
  },

  // Session Configuration
  SESSION: {
    TIMEOUT: 6 * 60 * 60 * 1000, // 6 hours
    CLEANUP_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours
    COOKIE_NAME: 'val-ai-auth',
    COOKIE_OPTIONS: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    },
  },

  // Rate Limiting Configuration
  RATE_LIMIT: {
    // General API endpoints
    API: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
    // Authentication endpoints (stricter)
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    },
    // Page requests
    PAGES: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 200,
    },
  },

  // Password Policy
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: false,
    SALT_ROUNDS: 12,
  },

  // Account Lockout
  LOCKOUT: {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    RESET_AFTER: 24 * 60 * 60 * 1000, // 24 hours
  },

  // File Upload Security
  FILE_UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
    SCAN_FOR_VIRUSES: process.env.NODE_ENV === 'production',
    QUARANTINE_SUSPICIOUS: true,
  },

  // Input Validation
  INPUT: {
    MAX_LENGTHS: {
      email: 254,
      name: 100,
      jobNumber: 20,
      address: 255,
      suburb: 100,
      state: 50,
      postcode: 10,
      phone: 20,
      comments: 5000,
      description: 1000,
    },
    SANITIZATION: {
      STRIP_HTML: true,
      ESCAPE_SQL: true,
      PREVENT_XSS: true,
      BLOCK_SCRIPTS: true,
    },
  },

  // CORS Configuration
  CORS: {
    ALLOWED_ORIGINS: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000'],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    CREDENTIALS: true,
  },

  // CSRF Protection
  CSRF: {
    TOKEN_LENGTH: 32,
    HEADER_NAME: 'x-csrf-token',
    IGNORE_METHODS: ['GET', 'HEAD', 'OPTIONS'],
    COOKIE_NAME: 'csrf-token',
  },

  // Content Security Policy
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'", process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''],
    STYLE_SRC: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
    IMG_SRC: ["'self'", "data:", "blob:", "https:", process.env.NODE_ENV === 'development' ? "http://localhost:5000" : ""],
    FONT_SRC: ["'self'", "fonts.gstatic.com"],
    CONNECT_SRC: ["'self'", process.env.NODE_ENV === 'development' ? "ws: wss:" : ''],
    FRAME_ANCESTORS: ["'none'"],
    BASE_URI: ["'self'"],
    FORM_ACTION: ["'self'"],
  },

  // Security Headers
  HEADERS: {
    HSTS: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    PERMISSIONS_POLICY: 'camera=(), microphone=(), geolocation=()',
  },

  // Audit Logging
  AUDIT: {
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    RETENTION_DAYS: 90,
    SENSITIVE_FIELDS: ['password', 'token', 'secret', 'key'],
    LOG_FAILED_LOGINS: true,
    LOG_ADMIN_ACTIONS: true,
    LOG_DATA_ACCESS: true,
  },

  // Data Protection
  DATA: {
    ENCRYPTION_ALGORITHM: 'aes-256-gcm',
    KEY_DERIVATION: 'pbkdf2',
    ITERATIONS: 100000,
    ANONYMIZE_LOGS: true,
    PII_FIELDS: ['email', 'name', 'address', 'phone'],
  },

  // Feature Flags
  FEATURES: {
    TWO_FACTOR_AUTH: false,
    CAPTCHA_ON_LOGIN: process.env.NODE_ENV === 'production',
    EMAIL_VERIFICATION: true,
    AUDIT_TRAIL: true,
    IP_WHITELIST: false,
    GEO_BLOCKING: false,
  },

  // API Security
  API_SECURITY: {
    REQUIRE_API_KEY: false,
    API_KEY_HEADER: 'X-API-Key',
    VERSIONING: true,
    REQUEST_ID_HEADER: 'X-Request-ID',
    RESPONSE_TIME_HEADER: 'X-Response-Time',
  },

  // Development/Testing
  DEV: {
    DISABLE_HTTPS_REDIRECT: process.env.NODE_ENV !== 'production',
    DISABLE_RATE_LIMITING: false,
    ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
    MOCK_EXTERNAL_SERVICES: process.env.NODE_ENV === 'test',
  },
} as const;

// Security event types for audit logging
export const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  PERMISSION_DENIED: 'permission_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  ADMIN_ACTION: 'admin_action',
  SECURITY_VIOLATION: 'security_violation',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  CSRF_VIOLATION: 'csrf_violation',
  XSS_ATTEMPT: 'xss_attempt',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  FILE_UPLOAD_BLOCKED: 'file_upload_blocked',
} as const;

// IP address validation patterns
export const IP_PATTERNS = {
  IPv4: /^(\d{1,3}\.){3}\d{1,3}$/,
  IPv6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  PRIVATE_IPv4: /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/,
  LOCALHOST: /^(127\.|::1|localhost)/,
};

// Common attack patterns for detection
export const ATTACK_PATTERNS = {
  SQL_INJECTION: [
    /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/i,
    /(--|\bOR\b|\bAND\b|\|)/i,
    /[';]+/,
  ],
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ],
  PATH_TRAVERSAL: [
    /\.\./,
    /\/\//,
    /\\/,
    /\0/,
    /%2e%2e/i,
    /%2f/i,
    /%5c/i,
  ],
  COMMAND_INJECTION: [
    /[;&|`]/,
    /\$\(/,
    /`[^`]*`/,
    /\|\s*\w/,
  ],
};

// Validate security configuration on startup
export function validateSecurityConfig(): void {
  const warnings: string[] = [];

  // Check JWT secret strength
  if (SECURITY_CONFIG.JWT.SECRET.length < 32) {
    warnings.push('JWT secret should be at least 32 characters long');
  }

  // Check if using default secrets
  if (SECURITY_CONFIG.JWT.SECRET.includes('change-this')) {
    warnings.push('JWT secret should be changed from default value');
  }

  // Warn about development settings in production
  if (process.env.NODE_ENV === 'production') {
    if (SECURITY_CONFIG.DEV.DISABLE_HTTPS_REDIRECT) {
      warnings.push('HTTPS redirect should be enabled in production');
    }
    if (SECURITY_CONFIG.DEV.ENABLE_DEBUG_LOGS) {
      warnings.push('Debug logs should be disabled in production');
    }
  }

  if (warnings.length > 0) {
    console.warn('Security Configuration Warnings:');
    warnings.forEach(warning => console.warn(`- ${warning}`));
  }
}

// Initialize security configuration validation
if (typeof window === 'undefined') {
  // Only run on server-side
  validateSecurityConfig();
} 