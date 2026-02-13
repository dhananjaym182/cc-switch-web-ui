import { Router, Request, Response } from 'express';
import { configStorage } from '../services/config-storage';
import { ccSwitchAdapter } from '../services/ccswitch-adapter';
import { SaveProfileRequest, LoadProfileRequest, Profile } from '../types/index';

const router = Router();

/**
 * GET /api/profiles
 * List all saved profiles
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const profiles = configStorage.getProfiles();
    res.json({
      success: true,
      data: {
        profiles,
        total: profiles.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list profiles';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/profiles/:id
 * Get a specific profile by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = configStorage.getProfileById(id);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
      return;
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/profiles/save
 * Save current configuration as a profile
 */
router.post('/save', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body as SaveProfileRequest;

    if (!name || name.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Profile name is required',
      });
      return;
    }

    // Check for duplicate name
    const existingProfiles = configStorage.getProfiles();
    const duplicate = existingProfiles.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      res.status(400).json({
        success: false,
        error: `Profile with name "${name}" already exists`,
      });
      return;
    }

    // Get current status
    const status = await ccSwitchAdapter.getStatus();
    const appConfig = configStorage.getAppConfig();

    if (!status.currentProvider) {
      res.status(400).json({
        success: false,
        error: 'No provider is currently active',
      });
      return;
    }

    const profile: Profile = {
      id: configStorage.generateId(),
      name: name.trim(),
      description: description?.trim(),
      providerId: status.currentProvider.id,
      providerName: status.currentProvider.name,
      config: {
        providerId: status.currentProvider.id,
        providerType: status.currentProvider.type,
        lastProfileId: appConfig.settings.lastProfileId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    configStorage.saveProfile(profile);

    configStorage.addLog({
      level: 'info',
      operation: 'save_profile',
      message: `Saved profile: ${profile.name}`,
      details: { profileId: profile.id, providerId: profile.providerId },
    });

    res.json({
      success: true,
      data: {
        message: 'Profile saved successfully',
        profile,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save profile';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/profiles/load
 * Load a saved profile
 */
router.post('/load', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.body as LoadProfileRequest;

    if (!profileId) {
      res.status(400).json({
        success: false,
        error: 'profileId is required',
      });
      return;
    }

    const profile = configStorage.getProfileById(profileId);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
      return;
    }

    // Switch to the profile's provider
    const switchResult = await ccSwitchAdapter.switchProvider(profile.providerId);

    if (!switchResult.success) {
      res.status(400).json({
        success: false,
        error: `Failed to switch provider: ${switchResult.message}`,
      });
      return;
    }

    // Update app config
    const appConfig = configStorage.getAppConfig();
    appConfig.settings.lastProfileId = profileId;
    configStorage.saveAppConfig(appConfig);

    configStorage.addLog({
      level: 'info',
      operation: 'load_profile',
      message: `Loaded profile: ${profile.name}`,
      details: { profileId, providerId: profile.providerId },
    });

    res.json({
      success: true,
      data: {
        message: 'Profile loaded successfully',
        profile,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load profile';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/profiles/:id
 * Delete a profile
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = configStorage.getProfileById(id);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
      return;
    }

    configStorage.deleteProfile(id);

    configStorage.addLog({
      level: 'info',
      operation: 'delete_profile',
      message: `Deleted profile: ${profile.name}`,
      details: { profileId: id },
    });

    res.json({
      success: true,
      data: {
        message: 'Profile deleted successfully',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete profile';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
