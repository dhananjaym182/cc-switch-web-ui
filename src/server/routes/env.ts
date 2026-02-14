import { Router, Request, Response } from 'express';
import { ccSwitchAdapter } from '../services/ccswitch-adapter.js';

const router = Router();

/**
 * GET /api/env
 * List all environment variables
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const app = req.query.app as string | undefined;
    const envVars = await ccSwitchAdapter.listEnvVars(app);
    
    res.json({
      success: true,
      data: { envVars },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list environment variables';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
