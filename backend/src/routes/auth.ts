import { Router, Request, Response } from 'express';
import { validatePassword } from '../middleware/auth';
import { LoginRequest, LoginResponse } from '../types/index';

const router = Router();

/**
 * POST /api/auth/login
 * Verify password and return success
 */
router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body as LoginRequest;

  if (!password) {
    const response: LoginResponse = {
      success: false,
      message: 'Password is required',
    };
    res.status(400).json(response);
    return;
  }

  if (validatePassword(password)) {
    const response: LoginResponse = {
      success: true,
      message: 'Authentication successful',
      token: password, // In this simple auth, password IS the token
    };
    res.json(response);
  } else {
    const response: LoginResponse = {
      success: false,
      message: 'Invalid password',
    };
    res.status(401).json(response);
  }
});

/**
 * POST /api/auth/verify
 * Verify if the current token is valid
 */
router.post('/verify', (_req: Request, res: Response) => {
  // If we reach here, auth middleware already validated the token
  res.json({
    success: true,
    message: 'Token is valid',
  });
});

export default router;
