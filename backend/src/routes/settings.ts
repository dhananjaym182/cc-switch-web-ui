import { Router, Request, Response } from 'express';
import { configStorage } from '../services/config-storage';

const router = Router();

/**
 * GET /api/settings
 * Get current application settings
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const appConfig = configStorage.getAppConfig();
    res.json({
      success: true,
      data: appConfig.settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get settings';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * PUT /api/settings
 * Update application settings
 */
router.put('/', async (req: Request, res: Response) => {
  const settings = req.body;

  try {
    const appConfig = configStorage.getAppConfig();
    
    // Update settings
    appConfig.settings = {
      ...appConfig.settings,
      ...settings,
    };

    // Save updated config
    configStorage.saveAppConfig(appConfig);

    res.json({
      success: true,
      data: appConfig.settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;