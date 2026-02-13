import { Router, Request, Response } from 'express';
import { ccSwitchAdapter } from '../services/ccswitch-adapter';

const router = Router();

/**
 * GET /api/config
 * Get current configuration
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await ccSwitchAdapter.getRawConfig();
    
    res.json({
      success: true,
      data: { config },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get config';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/config/path
 * Get configuration file path
 */
router.get('/path', async (req: Request, res: Response) => {
  try {
    const app = req.query.app as string | undefined;
    const path = await ccSwitchAdapter.getConfigPath(app);
    
    res.json({
      success: true,
      data: { path },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get config path';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/config/export
 * Export configuration
 */
router.post('/export', async (req: Request, res: Response) => {
  const { outputPath, app } = req.body;

  if (!outputPath) {
    res.status(400).json({
      success: false,
      error: 'outputPath is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.exportConfig(outputPath, app);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export config';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/config/import
 * Import configuration
 */
router.post('/import', async (req: Request, res: Response) => {
  const { inputPath, app } = req.body;

  if (!inputPath) {
    res.status(400).json({
      success: false,
      error: 'inputPath is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.importConfig(inputPath, app);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import config';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/config/backup
 * Backup configuration
 */
router.post('/backup', async (req: Request, res: Response) => {
  const app = req.query.app as string | undefined;

  try {
    const result = await ccSwitchAdapter.backupConfig(app);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to backup config';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/config/restore
 * Restore configuration
 */
router.post('/restore', async (req: Request, res: Response) => {
  const { backupPath, app } = req.body;

  if (!backupPath) {
    res.status(400).json({
      success: false,
      error: 'backupPath is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.restoreConfig(backupPath, app);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restore config';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
