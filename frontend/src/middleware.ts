import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token store (in production, use secure session storage)

interface TokenPayload {
  userId?: string;
  user_id?: string;
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}


interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

function rateLimit(keyId: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const key = `rate_limit_${keyId}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return true;
  }

  if (record.count >= options.maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  // Next.js exposes request.ip on many platforms; fallback to headers
  const reqIp = (request as any).ip as string | undefined;
  const ip = xForwardedFor?.split(',')[0]?.trim() || xRealIp || reqIp || 'unknown';
  return ip;
}

function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Simple JWT payload decoder (NOT verification - use Firebase Admin SDK for production)
function decodeFirebaseToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);

  // Skip middleware for static files and API routes that don't need protection
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  // Apply different rate limits based on path
  let rateLimitOptions: RateLimitOptions;
  let rateKeySuffix = 'pages';

  if (pathname.startsWith('/api/auth/session')) {
    // Session cookie sync can legitimately fire multiple times; allow generously
    rateLimitOptions = { windowMs: 60 * 1000, maxRequests: 60 }; // 60 req/min per IP
    rateKeySuffix = 'auth_session';
  } else if (pathname.startsWith('/api/auth')) {
    // Stricter rate limiting for sensitive auth endpoints
    rateLimitOptions = { windowMs: 15 * 60 * 1000, maxRequests: 30 }; // per-IP per 15 min
    rateKeySuffix = 'auth';
  } else if (pathname.startsWith('/api')) {
    // General API rate limiting
    rateLimitOptions = { windowMs: 15 * 60 * 1000, maxRequests: 100 }; // 100 requests per 15 minutes
    rateKeySuffix = 'api';
  } else {
    // Page requests
    rateLimitOptions = { windowMs: 15 * 60 * 1000, maxRequests: 200 }; // 200 requests per 15 minutes
    rateKeySuffix = 'pages';
  }

  // Apply rate limiting
  if (!rateLimit(`${clientIP}:${rateKeySuffix}`, rateLimitOptions)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '900', // 15 minutes
        'X-RateLimit-Limit': rateLimitOptions.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rateLimitOptions.windowMs).toISOString(),
      },
    });
  }


  // Authentication for protected routes
  const protectedPaths = ['/home', '/valuation-report', '/dashboard', '/admin', '/account'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    const token = request.cookies.get('val-ai-auth')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const payload = decodeFirebaseToken(token);
      if (!payload) {
        // Invalid token, redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('val-ai-auth');
        return response;
      }

      // Add user info to headers for API routes
      const requestHeaders = new Headers(request.headers);
      const userId = payload.user_id || payload.sub || '';
      const userEmail = payload.email || '';
      const userRole = payload.role || 'valuer';

      requestHeaders.set('x-user-id', userId);
      requestHeaders.set('x-user-email', userEmail);
      requestHeaders.set('x-user-role', userRole);

      // Generate CSRF token for this session
      /*if (!csrfTokenStore.has(token)) {
        csrfTokenStore.set(token, generateCSRFToken());
      }*/

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Set CSRF token in response header
      //response.headers.set('x-csrf-token', csrfTokenStore.get(token) || '');

      return response;
    } catch (error) {
      console.error('Token verification error:', error);
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('val-ai-auth');
      return response;
    }
  }

  // Role-based access control
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('val-ai-auth')?.value;
    if (token) {
      try {
        const payload = decodeFirebaseToken(token);
        if (!payload || payload.role !== 'admin') {
          return new NextResponse('Forbidden - Admin Access Required', { status: 403 });
        }
      } catch (error) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  // Security headers for all responses
  const response = NextResponse.next();

  // Remove server identification
  response.headers.delete('server');
  response.headers.delete('x-powered-by');

  // Add security headers (these supplement the ones in next.config.ts)
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Add rate limit headers
  const rateLimitRecord = rateLimitStore.get(`rate_limit_${clientIP}`);
  if (rateLimitRecord) {
    response.headers.set('X-RateLimit-Limit', rateLimitOptions.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, rateLimitOptions.maxRequests - rateLimitRecord.count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitRecord.resetTime).toISOString());
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 