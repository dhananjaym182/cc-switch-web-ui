import { Router, Request, Response } from 'express';
import { ccSwitchAdapter } from '../services/ccswitch-adapter';

const router = Router();

/**
 * GET /api/prompts
 * List all prompts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const app = req.query.app as string | undefined;
    const prompts = await ccSwitchAdapter.listPrompts(app);
    
    res.json({
      success: true,
      data: { prompts },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list prompts';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/prompts/:promptId/activate
 * Activate a prompt
 */
router.post('/:promptId/activate', async (req: Request, res: Response) => {
  const { promptId } = req.params;
  const app = req.query.app as string | undefined;

  try {
    const result = await ccSwitchAdapter.activatePrompt(promptId, app);

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
    const message = error instanceof Error ? error.message : 'Failed to activate prompt';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/prompts/deactivate
 * Deactivate the current prompt
 */
router.post('/deactivate', async (req: Request, res: Response) => {
  const app = req.query.app as string | undefined;

  try {
    const result = await ccSwitchAdapter.deactivatePrompt(app);

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
    const message = error instanceof Error ? error.message : 'Failed to deactivate prompt';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/prompts/create
 * Create a new prompt
 */
router.post('/create', async (req: Request, res: Response) => {
  const { name, content, description, app } = req.body;

  if (!name || !content) {
    res.status(400).json({
      success: false,
      error: 'name and content are required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.createPrompt({
      id: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name,
      content,
      description,
      app,
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
    const message = error instanceof Error ? error.message : 'Failed to create prompt';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/prompts/edit
 * Edit a prompt
 */
router.post('/edit', async (req: Request, res: Response) => {
  const { id, name, content, description, app } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'id is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.editPrompt(id, {
      name,
      content,
      description,
      app,
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
    const message = error instanceof Error ? error.message : 'Failed to edit prompt';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/prompts/:promptId
 * Delete a prompt
 */
router.delete('/:promptId', async (req: Request, res: Response) => {
  const { promptId } = req.params;
  const app = req.query.app as string | undefined;

  try {
    const result = await ccSwitchAdapter.deletePrompt(promptId, app);

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
    const message = error instanceof Error ? error.message : 'Failed to delete prompt';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
