import { z } from 'zod';

// Common validation patterns
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
const postcodeRegex = /^[0-9]{4,6}$/;

// Input sanitization
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254);
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Authentication validation schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Login ID is required')
    .max(254, 'Login ID too long')
    .transform(v => v.trim().toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
    .transform(sanitizeString),
  email: z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Email too long')
    .regex(emailRegex, 'Invalid email format')
    .transform(sanitizeEmail),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'valuer', 'viewer']).default('viewer'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Property validation schemas
export const addressSchema = z.object({
  street: z
    .string()
    .min(1, 'Street address is required')
    .max(255, 'Street address too long')
    .transform(sanitizeString),
  suburb: z
    .string()
    .min(1, 'Suburb is required')
    .max(100, 'Suburb too long')
    .transform(sanitizeString),
  state: z
    .string()
    .min(1, 'State is required')
    .max(50, 'State too long')
    .transform(sanitizeString),
  postcode: z
    .string()
    .min(4, 'Postcode must be at least 4 digits')
    .max(6, 'Postcode too long')
    .regex(postcodeRegex, 'Invalid postcode format'),
});

export const propertyBasicSchema = z.object({
  jobNumber: z
    .string()
    .min(1, 'Job number is required')
    .max(20, 'Job number too long')
    .regex(/^[A-Z0-9\-]+$/, 'Job number can only contain letters, numbers, and hyphens')
    .transform(sanitizeString),
  propertyValuer: z
    .string()
    .min(1, 'Property valuer is required')
    .max(100, 'Valuer name too long')
    .transform(sanitizeString),
  dateOfValuation: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine((date) => {
      const d = new Date(date);
      return d instanceof Date && !isNaN(d.getTime());
    }, 'Invalid date'),
  clientName: z
    .string()
    .max(100, 'Client name too long')
    .transform(sanitizeString)
    .optional(),
  propertyType: z
    .string()
    .max(100, 'Property type too long')
    .transform(sanitizeString)
    .optional(),
});

export const valuationDetailsSchema = z.object({
  marketValue: z
    .string()
    .regex(/^\$?[\d,]+(\.\d{2})?$/, 'Invalid currency format')
    .optional(),
  landValue: z
    .string()
    .regex(/^\$?[\d,]+(\.\d{2})?$/, 'Invalid currency format')
    .optional(),
  improvements: z
    .string()
    .max(500, 'Improvements description too long')
    .transform(sanitizeString)
    .optional(),
  interestValued: z
    .string()
    .max(200, 'Interest valued too long')
    .transform(sanitizeString)
    .optional(),
  instructingParty: z
    .string()
    .max(300, 'Instructing party too long')
    .transform(sanitizeString)
    .optional(),
  dateOfInstruction: z
    .string()
    .optional(),
  primaryMethod: z
    .string()
    .max(100, 'Primary method too long')
    .transform(sanitizeString)
    .optional(),
  secondaryMethod: z
    .string()
    .max(100, 'Secondary method too long')
    .transform(sanitizeString)
    .optional(),
  commercialSubType: z
    .string()
    .max(100, 'Commercial subtype too long')
    .transform(sanitizeString)
    .optional(),
  purposeOfReport: z
    .string()
    .max(1000, 'Purpose of report too long')
    .transform(sanitizeString)
    .optional(),
});

export const commentSchema = z.object({
  comments: z
    .string()
    .max(5000, 'Comments too long')
    .transform(sanitizeHtml)
    .optional(),
});

// File upload validation
export const fileValidationSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
  type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'application/pdf'], {
    errorMap: () => ({ message: 'Only JPEG, PNG, GIF, and PDF files are allowed' }),
  }),
});

// Rate limiting validation
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

export const defaultRateLimit: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  skipSuccessfulRequests: true,
};

export const authRateLimit: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: false,
};

// CSRF token validation
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for server-side
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken || token.length !== expectedToken.length) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return result === 0;
}

// IP address validation and anonymization
export function validateIPAddress(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export function anonymizeIP(ip: string): string {
  if (!validateIPAddress(ip)) return 'invalid';
  
  if (ip.includes(':')) {
    // IPv6 - zero out last 64 bits
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::';
  } else {
    // IPv4 - zero out last octet
    const parts = ip.split('.');
    return parts.slice(0, 3).join('.') + '.0';
  }
}

// Input length validation
export const MAX_LENGTHS = {
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
} as const;

export function validateLength(field: keyof typeof MAX_LENGTHS, value: string): boolean {
  return value.length <= MAX_LENGTHS[field];
}

// XSS prevention
export function stripScripts(input: string): string {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

export function escapeHtml(input: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// SQL injection prevention helpers
export function validateSqlInput(input: string): boolean {
  const sqlPatterns = [
    /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/i,
    /(--|\bOR\b|\bAND\b|\|)/i,
    /[';]+/
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(input));
}

// Path traversal prevention
export function validatePath(path: string): boolean {
  const dangerousPatterns = [
    /\.\./,
    /\/\//,
    /\\/,
    /\0/,
    /%2e%2e/i,
    /%2f/i,
    /%5c/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(path));
}

// Export validation functions
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type PropertyBasicInput = z.infer<typeof propertyBasicSchema>;
export type ValuationDetailsInput = z.infer<typeof valuationDetailsSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type FileInput = z.infer<typeof fileValidationSchema>; 