import { Router, Request, Response } from 'express';
import { ccSwitchAdapter } from '../services/ccswitch-adapter';

const router = Router();

/**
 * GET /api/mcp
 * List all MCP servers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const app = req.query.app as string | undefined;
    const servers = await ccSwitchAdapter.listMcpServers(app);
    
    res.json({
      success: true,
      data: { servers },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list MCP servers';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/mcp
 * Add a new MCP server
 */
router.post('/', async (req: Request, res: Response) => {
  const { name, command, args, env, app } = req.body;

  if (!name || !command) {
    res.status(400).json({
      success: false,
      error: 'name and command are required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.addMcpServer({
      name,
      command,
      args,
      env,
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
    const message = error instanceof Error ? error.message : 'Failed to add MCP server';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/mcp/edit
 * Edit an MCP server
 */
router.post('/edit', async (req: Request, res: Response) => {
  const { id, name, command, args, env } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'id is required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.editMcpServer({
      id,
      name,
      command,
      args,
      env,
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
    const message = error instanceof Error ? error.message : 'Failed to edit MCP server';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/mcp/toggle
 * Toggle an MCP server
 */
router.post('/toggle', async (req: Request, res: Response) => {
  const { id, enabled, app } = req.body;

  if (!id || enabled === undefined || !app) {
    res.status(400).json({
      success: false,
      error: 'id, enabled, and app are required',
    });
    return;
  }

  try {
    const result = await ccSwitchAdapter.toggleMcpServer(id, enabled, app);

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
    const message = error instanceof Error ? error.message : 'Failed to toggle MCP server';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/mcp/:serverId
 * Delete an MCP server
 */
router.delete('/:serverId', async (req: Request, res: Response) => {
  const { serverId } = req.params;
  const app = req.query.app as string | undefined;

  try {
    const result = await ccSwitchAdapter.deleteMcpServer(serverId, app);

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
    const message = error instanceof Error ? error.message : 'Failed to delete MCP server';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/mcp/sync
 * Sync MCP servers
 */
router.post('/sync', async (req: Request, res: Response) => {
  const app = req.query.app as string | undefined;

  try {
    const result = await ccSwitchAdapter.syncMcpServers(app);

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
    const message = error instanceof Error ? error.message : 'Failed to sync MCP servers';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
