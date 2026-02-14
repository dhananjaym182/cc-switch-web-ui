import { Router, Request, Response } from 'express';
import { ccSwitchAdapter } from '../services/ccswitch-adapter.js';
import { configStorage } from '../services/config-storage.js';

const router = Router();

/**
 * GET /api/providers
 * List all cc-switch providers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const app = req.query.app as string | undefined;
    const result = await ccSwitchAdapter.listProviders(app);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list providers';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/providers/switch
 * Switch to a different provider
 */
/**
 * POST /api/providers/add
 * Add a new provider
 */
router.post('/add', async (req: Request, res: Response) => {
  const { id, name, apiUrl, apiKey, app, websiteUrl, notes, sortIndex, model, haikuModel, sonnetModel, opusModel } = req.body;

  if (!id || !name || !apiUrl) {
    res.status(400).json({
      success: false,
      error: 'id, name, and apiUrl are required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.addProvider({
      id,
      name,
      apiUrl,
      apiKey,
      app,
      websiteUrl,
      notes,
      sortIndex,
      model,
      haikuModel,
      sonnetModel,
      opusModel,
    });

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
    const message = error instanceof Error ? error.message : 'Failed to add provider';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

router.post('/switch', async (req: Request, res: Response) => {
  const { providerId } = req.body;

  if (!providerId) {
    res.status(400).json({
      success: false,
      error: 'providerId is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.switchProvider(providerId);
    
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
    const message = error instanceof Error ? error.message : 'Failed to switch provider';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/providers/current
 * Get the current active provider
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const app = req.query.app as string | undefined;
    const appConfig = configStorage.getAppConfig();
    const providers = await ccSwitchAdapter.listProviders(app);
    const currentProvider = providers.providers.find(
      (p) => p.id === appConfig.settings.lastProviderId
    );

    res.json({
      success: true,
      data: {
        provider: currentProvider || null,
        providerId: appConfig.settings.lastProviderId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get current provider';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/providers/edit
 * Edit an existing provider
 */
router.post('/edit', async (req: Request, res: Response) => {
  const { id, name, apiUrl, apiKey, app, websiteUrl, notes, sortIndex, model, haikuModel, sonnetModel, opusModel } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'id is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.editProvider({
      id,
      name,
      apiUrl,
      apiKey,
      app,
      websiteUrl,
      notes,
      sortIndex,
      model,
      haikuModel,
      sonnetModel,
      opusModel,
    });

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
    const message = error instanceof Error ? error.message : 'Failed to edit provider';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/providers/duplicate
 * Duplicate a provider
 */
router.post('/duplicate', async (req: Request, res: Response) => {
  const { providerId, newId, app } = req.body;

  if (!providerId || !newId) {
    res.status(400).json({
      success: false,
      error: 'providerId and newId are required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.duplicateProvider(providerId, newId, app);

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
    const message = error instanceof Error ? error.message : 'Failed to duplicate provider';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/providers/speedtest
 * Run speedtest for a provider
 */
router.post('/speedtest', async (req: Request, res: Response) => {
  const { providerId, app } = req.body;

  if (!providerId) {
    res.status(400).json({
      success: false,
      error: 'providerId is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.speedtestProvider(providerId, app);

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
    const message = error instanceof Error ? error.message : 'Failed to speedtest provider';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/providers/:providerId
 * Delete a provider
 */
router.delete('/:providerId', async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const app = req.query.app as string | undefined;

  try {
    const result = await ccSwitchAdapter.deleteProvider(providerId, app);

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
    const message = error instanceof Error ? error.message : 'Failed to delete provider';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
