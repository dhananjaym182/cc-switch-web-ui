import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware for cc-switch-web-ui
 * Uses simple bearer token auth (password as token)
 */

// Extend Express Request to include auth info
declare global {
  namespace Express {
    interface Request {
      authenticated?: boolean;
    }
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authentication middleware
 * Validates the bearer token against ADMIN_PASSWORD from environment
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // If no password is configured, allow all requests (development mode)
  if (!adminPassword) {
    console.warn('WARNING: ADMIN_PASSWORD not set. Authentication disabled.');
    req.authenticated = true;
    next();
    return;
  }

  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Use: Bearer <token>',
    });
    return;
  }

  if (token !== adminPassword) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid token',
    });
    return;
  }

  req.authenticated = true;
  next();
}

/**
 * Optional authentication middleware
 * Sets authenticated flag but doesn't reject if not authenticated
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    req.authenticated = false;
    next();
    return;
  }

  const token = extractBearerToken(req.headers.authorization);
  req.authenticated = token === adminPassword;
  next();
}

/**
 * Check if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

/**
 * Validate password for login endpoint
 */
export function validatePassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    return true; // No password configured, accept any
  }
  
  return password === adminPassword;
}
