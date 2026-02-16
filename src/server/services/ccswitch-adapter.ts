import { spawn, SpawnOptions } from 'child_process';
import {
  Provider,
  ProviderListResponse,
  SwitchProviderResponse,
  StatusResponse,
  isCoreApp,
  AppType,
} from '../types/index.js';
import { configStorage } from './config-storage.js';
import { kilocodeService } from './kilocode-service.js';

/**
 * Adapter for cc-switch CLI
 * Executes cc-switch commands and parses output
 */
export class CCSwitchAdapter {
  private readonly defaultBinaryPath: string;
  private readonly defaultSrcTauriPath: string | undefined;

  constructor() {
    // Default paths for the cc-switch binary
    this.defaultBinaryPath = process.env.CC_SWITCH_PATH || '/usr/local/bin/cc-switch';
    this.defaultSrcTauriPath = undefined;
  }

  /**
   * Get the path to the cc-switch binary
   */
  private getBinaryPath(): string {
    return this.defaultBinaryPath;
  }

  /**
   * Get the app flag for CLI commands.
   * Only core apps (claude, codex, gemini) are supported by the cc-switch CLI.
   * Custom apps (kilocode-cli, opencode, amp) should not be passed to CLI commands.
   * 
   * @param app - The app type to check
   * @returns Array of args for the --app flag, or empty array if custom app
   */
  private getAppFlagArgs(app?: string): string[] {
    if (!app || !isCoreApp(app as AppType)) {
      return [];
    }
    return ['--app', app];
  }

  /**
   * Execute a cc-switch command
   */
  private async execute(
    args: string[],
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const binaryPath = this.getBinaryPath();
    const cwd = options.cwd || this.defaultSrcTauriPath;
    const timeout = options.timeout || 30000;

    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        cwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      };

      const child = spawn(binaryPath, args, spawnOptions);

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Check if cc-switch binary is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.execute(['--help'], {
        cwd: undefined, // Use PATH instead of specific directory
        timeout: 5000
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get list of providers from cc-switch
   */
  async listProviders(app?: string): Promise<ProviderListResponse> {
    try {
      if (app === 'kilocode-cli') {
        const providers = await kilocodeService.listProviders();
        const currentProvider = providers.find(p => p.isActive);
        return {
          providers,
          currentProviderId: currentProvider ? currentProvider.id : null,
        };
      }

      const args = [...this.getAppFlagArgs(app), 'provider', 'list'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list providers: ${result.stderr}`);
      }

      // Parse the output - format depends on cc-switch output
      const providers = this.parseProviderList(result.stdout);
      
      // Extract current provider from output footer
      let currentProviderId = this.extractCurrentProvider(result.stdout);
      
      // Fallback to config if not found in output
      if (!currentProviderId) {
        const appConfig = configStorage.getAppConfig();
        currentProviderId = appConfig.settings?.lastProviderId || null;
      }

      // Fetch full configuration for each provider from the database
      const providersWithConfig = await this.enrichProvidersWithConfig(providers, app);

      return {
        providers: providersWithConfig,
        currentProviderId,
      };
    } catch (error) {
      console.error('Error listing providers:', error);
      throw error;
    }
  }

  /**
   * Enrich providers with full configuration from database
   */
  private async enrichProvidersWithConfig(providers: Provider[], app?: string): Promise<Provider[]> {
    try {
      const dbPath = await this.getDbPath();
      const appType = app || 'claude';
      
      // Query all provider configs for the app
      const sql = `SELECT id, settings_config, website_url, notes, sort_index FROM providers WHERE app_type = '${appType}';`;
      const rows = await this.executeSqliteQueryJsonAll(dbPath, sql);
      
      // Parse the result and build a map
      const configMap = new Map<string, { settingsConfig: Record<string, any>; websiteUrl: string; notes: string; sortIndex: number }>();
      
      for (const row of rows) {
        const id = row.id;
        let settingsConfig: Record<string, any> = {};
        
        try {
          if (row.settings_config) {
            if (typeof row.settings_config === 'string') {
              settingsConfig = JSON.parse(row.settings_config);
            } else {
              settingsConfig = row.settings_config;
            }
          }
        } catch {
          // Ignore parse errors
        }
        
        configMap.set(id, {
          settingsConfig,
          websiteUrl: row.website_url || '',
          notes: row.notes || '',
          sortIndex: row.sort_index || 0
        });
      }
      
      // Enrich providers with config
      return providers.map(provider => {
        const configData = configMap.get(provider.id);
        if (configData) {
          return {
            ...provider,
            config: {
              ...configData.settingsConfig,
              websiteUrl: configData.websiteUrl,
              notes: configData.notes,
              sortIndex: configData.sortIndex,
            },
          };
        }
        return provider;
      });
    } catch (error) {
      console.error('Error enriching providers with config:', error);
      return providers;
    }
  }

  /**
   * Extract current provider from output footer
   */
  private extractCurrentProvider(output: string): string | null {
    const lines = output.split('\n');
    for (const line of lines) {
      // Look for "→ Current: provider-id" pattern
      if (line.includes('→ Current:')) {
        const match = line.match(/→\s*Current:\s*(\S+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    return null;
  }

  /**
   * Parse provider list output from cc-switch
   */
  private parseProviderList(output: string): Provider[] {
    const providers: Provider[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, comments, and separators
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('===')) {
        continue;
      }

      // Skip lines that are purely box drawing characters (table borders), allowing for spaces
      if (/^[┌┐└┘├┤┬┴┼─═│║╞╡╪╤╧╟╢╥╨╫╬╭╮╯╰╱╲╳╌\s]+$/.test(trimmed)) {
        continue;
      }

      // Skip footer info lines
      if (trimmed.startsWith('ℹ') || trimmed.startsWith('→')) {
        continue;
      }

      // Handle table format (cc-switch output) - lines with ┆ separator
      if (trimmed.includes('┆')) {
        // Skip header rows
        if (trimmed.includes('ID') || trimmed.includes('Name') || trimmed.includes('API URL')) {
          continue;
        }
        
        // Skip lines that are mostly box drawing characters
        if (trimmed.match(/[┌┐└┘├┤┬┴┼─═╞╡╪╤╧╟╢╥╨╫╬]/)) {
          continue;
        }
        
        // Parse data rows
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 3) {
          const isActive = cells[0].includes('✓');
          const id = cells[1];
          const name = cells[2];
          
          // Only process valid provider rows with actual data
          if (id && id !== '' && name && name !== '') {
            providers.push({
              id,
              name,
              type: this.inferProviderType(id),
              isActive,
            });
          }
        }
        continue;
      }

      // Handle simple format (non-table output)
      // Check if this line has an active marker
      const isActive = trimmed.includes('[active]') || trimmed.includes('[*]');
      const cleanLine = trimmed
        .replace(/\[active\]/g, '')
        .replace(/\[\*\]/g, '')
        .trim();

      // Split by whitespace to get id and name
      const parts = cleanLine.split(/\s+/);
      if (parts.length >= 1 && parts[0]) {
        const id = parts[0];
        
        // Skip if id looks like a table border or invalid identifier
        // Check if it starts with a box char OR contains only box chars/symbols
        // Also ensure it has at least one alphanumeric character to avoid parsing artifacts as IDs
        if (/^[┌┐└┘├┤┬┴┼─═│║╞╡╪╤╧╟╢╥╨╫╬╭╮╯╰╱╲╳╌]/.test(id) || !/[a-zA-Z0-9]/.test(id)) {
          continue;
        }

        const name = parts.slice(1).join(' ') || id;

        providers.push({
          id,
          name,
          type: this.inferProviderType(id),
          isActive,
        });
      }
    }

    return providers;
  }

  /**
   * Infer provider type from ID
   */
  private inferProviderType(id: string): Provider['type'] {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('claude') || lowerId.includes('anthropic')) {
      return 'claude';
    }
    if (lowerId.includes('gemini') || lowerId.includes('google')) {
      return 'gemini';
    }
    if (lowerId.includes('codex') || lowerId.includes('openai')) {
      return 'codex';
    }
    return 'custom';
  }

  /**
   * Switch to a provider
   */
  async switchProvider(providerId: string, app?: string): Promise<SwitchProviderResponse> {
    try {
      // Get current provider before switch
      const appConfig = configStorage.getAppConfig();
      const previousProviderId = appConfig.settings.lastProviderId;

      if (app === 'kilocode-cli') {
        await kilocodeService.switchProvider(providerId);
      } else {
        const args = [...this.getAppFlagArgs(app), 'provider', 'switch', providerId];
        const result = await this.execute(args);

        if (result.exitCode !== 0) {
          return {
            success: false,
            message: `Failed to switch provider: ${result.stderr || result.stdout}`,
          };
        }
      }

      // Update config with new provider
      appConfig.settings.lastProviderId = providerId;
      configStorage.saveAppConfig(appConfig);

      // Log the operation
      configStorage.addLog({
        level: 'info',
        operation: 'switch_provider',
        message: `Switched to provider: ${providerId}`,
        details: { previousProviderId, currentProviderId: providerId },
      });

      return {
        success: true,
        message: `Successfully switched to provider: ${providerId}`,
        previousProviderId: previousProviderId ?? undefined,
        currentProviderId: providerId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      configStorage.addLog({
        level: 'error',
        operation: 'switch_provider',
        message: `Failed to switch provider: ${errorMessage}`,
        details: { providerId, error: errorMessage },
      });

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get current configuration status
   */
  async getStatus(): Promise<StatusResponse> {
    try {
      const result = await this.execute(['config', 'show']);

      // Parse config output (stored for potential future use)
      void this.parseConfigShow(result.stdout);
      
      // Get app config
      const appConfig = configStorage.getAppConfig();
      
      // Get current profile if any
      let activeProfile = null;
      if (appConfig.settings?.lastProfileId) {
        activeProfile = configStorage.getProfileById(appConfig.settings.lastProfileId);
      }

      // Find current provider
      const providers = await this.listProviders();
      const currentProvider = providers.providers.find(
        (p) => p.id === (appConfig.settings?.lastProviderId || null)
      ) || null;

      return {
        currentProvider,
        activeProfile,
        lastSwitchAt: appConfig.lastUpdated,
        version: appConfig.version,
      };
    } catch (error) {
      console.error('Error getting status:', error);
      
      // Return minimal status on error
      const appConfig = configStorage.getAppConfig();
      return {
        currentProvider: null,
        activeProfile: null,
        lastSwitchAt: appConfig.lastUpdated,
        version: appConfig.version,
      };
    }
  }

  /**
   * Parse config show output
   */
  private parseConfigShow(output: string): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Try to parse key-value pairs
      // Format could be: "key: value" or "key = value"
      const colonIndex = trimmed.indexOf(':');
      const equalIndex = trimmed.indexOf('=');

      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        if (key) {
          config[key] = value;
        }
      } else if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        if (key) {
          config[key] = value;
        }
      }
    }

    return config;
  }

  /**
   * Get raw config output
   */
  async getRawConfig(): Promise<string> {
    const result = await this.execute(['config', 'show']);
    return result.stdout;
  }

  // ============================================
  // Provider Management Methods
  // ============================================

  /**
   * Add a new provider
   */
  async addProvider(params: {
    id: string;
    name: string;
    apiUrl: string;
    apiKey?: string;
    app?: string;
    websiteUrl?: string;
    notes?: string;
    sortIndex?: number;
    model?: string;
    models?: Record<string, any>;
    haikuModel?: string;
    sonnetModel?: string;
    opusModel?: string;
    providerType?: string;
    usePromptCache?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    // Validate ID format (alphanumeric + hyphens/underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(params.id)) {
        return {
            success: false,
            message: 'Provider ID must contain only alphanumeric characters, hyphens, and underscores.'
        };
    }

    try {
      const app = params.app || 'claude';
      
      if (app === 'kilocode-cli') {
        await kilocodeService.addProvider(params);
        return { success: true, message: `Successfully added provider '${params.id}' to Kilocode` };
      }

      const id = params.id;
      const name = params.name;
      const apiUrl = params.apiUrl;
      const apiKey = params.apiKey || '';
      const websiteUrl = params.websiteUrl || '';
      const notes = params.notes || '';
      const sortIndex = params.sortIndex || 0;

      // Construct settings_config JSON based on app type
      let settingsConfig: Record<string, any> = {};
      
      if (app === 'claude') {
        // Claude uses ANTHROPIC_AUTH_TOKEN and ANTHROPIC_BASE_URL
        // with model configuration for default, haiku, sonnet, opus
        const defaultModel = params.model || 'claude-3-5-sonnet-20241022';
        const haikuModel = params.haikuModel || '';
        const sonnetModel = params.sonnetModel || '';
        const opusModel = params.opusModel || '';
        
        const envConfig: Record<string, string> = {
          ANTHROPIC_AUTH_TOKEN: apiKey,
          ANTHROPIC_BASE_URL: apiUrl,
          ANTHROPIC_MODEL: defaultModel,
        };
        
        // Add optional model configurations
        if (haikuModel) {
          envConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL = haikuModel;
        }
        if (sonnetModel) {
          envConfig.ANTHROPIC_DEFAULT_SONNET_MODEL = sonnetModel;
        }
        if (opusModel) {
          envConfig.ANTHROPIC_DEFAULT_OPUS_MODEL = opusModel;
        }
        
        settingsConfig = {
          env: envConfig
        };
      } else if (app === 'codex') {
        // Codex uses TOML config format with model and model_provider settings
        const modelValue = params.model || 'gpt-4o';
        settingsConfig = {
          auth: {
            OPENAI_API_KEY: apiKey
          },
          config: `model = "${modelValue}"\nmodel_provider = "openai-chat-completions"\npreferred_auth_method = "apikey"\n\n[model_providers.openai-chat-completions]\nname = "OpenAI"\nbase_url = "${apiUrl}"\nwire_api = "responses"\n`
        };
      } else if (app === 'gemini') {
        // Gemini uses GEMINI_API_KEY and optional model configuration
        const defaultModel = params.model || 'gemini-2.0-flash';
        settingsConfig = {
          env: {
            GEMINI_API_KEY: apiKey,
            GOOGLE_API_KEY: apiKey,
            GEMINI_MODEL: defaultModel,
            GEMINI_BASE_URL: apiUrl
          }
        };
      } else {
        // Default generic structure
        settingsConfig = {
          env: {
            API_KEY: apiKey,
            BASE_URL: apiUrl
          }
        };
      }

      const settingsConfigStr = JSON.stringify(settingsConfig);
      const metaStr = '{}';
      const costMultiplier = '1.0';
      const providerType = 'custom';
      const category = 'custom';

      // Construct SQL INSERT statement with all fields
      const sql = `INSERT INTO providers (id, app_type, name, settings_config, website_url, category, meta, is_current, in_failover_queue, cost_multiplier, provider_type, notes, sort_index, created_at) VALUES ('${id}', '${app}', '${name.replace(/'/g, "''")}', '${settingsConfigStr.replace(/'/g, "''")}', '${websiteUrl.replace(/'/g, "''")}', '${category}', '${metaStr}', 0, 0, '${costMultiplier}', '${providerType}', '${notes.replace(/'/g, "''")}', ${sortIndex}, strftime('%s', 'now'));`;

      // Get DB path
      const dbPath = await this.getDbPath();
      
      // Execute sqlite3 command
      const result = await this.executeSqlite(dbPath, sql);
      
      if (result.success) {
        result.message = `Successfully added provider '${id}'`;
      }
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Edit an existing provider
   */
  async editProvider(params: {
    id: string;
    name?: string;
    apiUrl?: string;
    apiKey?: string;
    app?: string;
    websiteUrl?: string;
    notes?: string;
    sortIndex?: number;
    model?: string;
    models?: Record<string, any>;
    haikuModel?: string;
    sonnetModel?: string;
    opusModel?: string;
    providerType?: string;
    usePromptCache?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const app = params.app || 'claude';
      const id = params.id;
      
      if (app === 'kilocode-cli') {
        await kilocodeService.editProvider(id, params);
        return { success: true, message: 'Provider updated successfully' };
      }

      // Get DB path
      const dbPath = await this.getDbPath();
      
      // Get current provider data first to merge using JSON query for reliable parsing
      const currentSql = `SELECT settings_config, name FROM providers WHERE id = '${id}' AND app_type = '${app}';`;
      const currentResult = await this.executeSqliteQueryJson(dbPath, currentSql);
      
      if (!currentResult) {
        return { success: false, message: 'Provider not found' };
      }

      // Build update statements
      const updates: string[] = [];
      
      // Update name if provided
      if (params.name) {
        updates.push(`name = '${params.name.replace(/'/g, "''")}'`);
      }
      
      // Update website_url if provided
      if (params.websiteUrl !== undefined) {
        updates.push(`website_url = '${params.websiteUrl.replace(/'/g, "''")}'`);
      }
      
      // Update notes if provided
      if (params.notes !== undefined) {
        updates.push(`notes = '${params.notes.replace(/'/g, "''")}'`);
      }
      
      // Update sort_index if provided
      if (params.sortIndex !== undefined) {
        updates.push(`sort_index = ${params.sortIndex}`);
      }
      
      // If we're updating API config, we need to rebuild the settings_config
      if (params.apiUrl || params.apiKey || params.model || params.haikuModel || params.sonnetModel || params.opusModel) {
        // Parse current settings from JSON result
        let currentSettings: Record<string, any> = {};
        try {
          if (currentResult.settings_config) {
            if (typeof currentResult.settings_config === 'string') {
              currentSettings = JSON.parse(currentResult.settings_config);
            } else {
              currentSettings = currentResult.settings_config;
            }
          }
        } catch (error) {
          console.error('Error parsing current settings:', error);
        }
        
        let settingsConfig: Record<string, any> = currentSettings;

        if (app === 'claude') {
          // Merge with existing settings for Claude
          const currentEnv = currentSettings.env || {};
          const envConfig: Record<string, string> = {
            ...currentEnv,
          };
          
          // Update API credentials if provided
          if (params.apiKey) {
            envConfig.ANTHROPIC_AUTH_TOKEN = params.apiKey;
          }
          if (params.apiUrl) {
            envConfig.ANTHROPIC_BASE_URL = params.apiUrl;
          }
          
          // Update model configurations if provided
          if (params.model !== undefined) {
            envConfig.ANTHROPIC_MODEL = params.model;
          }
          if (params.haikuModel !== undefined) {
            if (params.haikuModel) {
              envConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL = params.haikuModel;
            } else {
              delete envConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL;
            }
          }
          if (params.sonnetModel !== undefined) {
            if (params.sonnetModel) {
              envConfig.ANTHROPIC_DEFAULT_SONNET_MODEL = params.sonnetModel;
            } else {
              delete envConfig.ANTHROPIC_DEFAULT_SONNET_MODEL;
            }
          }
          if (params.opusModel !== undefined) {
            if (params.opusModel) {
              envConfig.ANTHROPIC_DEFAULT_OPUS_MODEL = params.opusModel;
            } else {
              delete envConfig.ANTHROPIC_DEFAULT_OPUS_MODEL;
            }
          }
          
          settingsConfig = {
            ...currentSettings,
            env: envConfig
          };
        } else if (app === 'codex') {
          // For Codex, update the TOML config
          const currentAuth = currentSettings.auth || {};
          const model = params.model || 'gpt-4o';
          const apiUrl = params.apiUrl || '';
          
          settingsConfig = {
            ...currentSettings,
            auth: {
              ...currentAuth,
              OPENAI_API_KEY: params.apiKey || currentAuth.OPENAI_API_KEY || ''
            },
            config: `model = "${model}"\nmodel_provider = "openai-chat-completions"\npreferred_auth_method = "apikey"\n\n[model_providers.openai-chat-completions]\nname = "OpenAI"\nbase_url = "${apiUrl}"\nwire_api = "responses"\n`
          };
        } else if (app === 'gemini') {
          // Merge with existing settings for Gemini
          const currentEnv = currentSettings.env || {};
          
          settingsConfig = {
            ...currentSettings,
            env: {
              ...currentEnv,
              GEMINI_API_KEY: params.apiKey || currentEnv.GEMINI_API_KEY || '',
              GOOGLE_API_KEY: params.apiKey || currentEnv.GOOGLE_API_KEY || '',
              GEMINI_BASE_URL: params.apiUrl || currentEnv.GEMINI_BASE_URL || '',
              GEMINI_MODEL: params.model || currentEnv.GEMINI_MODEL || 'gemini-2.0-flash'
            }
          };
        }
        
        const settingsConfigStr = JSON.stringify(settingsConfig);
        updates.push(`settings_config = '${settingsConfigStr.replace(/'/g, "''")}'`);
      }

      if (updates.length === 0) {
        return { success: true, message: 'No changes provided' };
      }

      const updateSql = `UPDATE providers SET ${updates.join(', ')} WHERE id = '${id}' AND app_type = '${app}';`;
      const result = await this.executeSqlite(dbPath, updateSql);
      
      if (result.success) {
        result.message = 'Provider updated successfully';
      }
      
      return result;

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Duplicate a provider (optionally to a different app)
   */
  async duplicateProvider(id: string, newId: string, app: string = 'claude', targetApp?: string): Promise<{ success: boolean; message: string }> {
    try {
        // Validate new ID format
        if (!/^[a-zA-Z0-9_-]+$/.test(newId)) {
            return {
                success: false,
                message: 'New provider ID must contain only alphanumeric characters, hyphens, and underscores.'
            };
        }
        
        const destApp = targetApp || app; // Use target app if specified, otherwise use source app

        if (app === 'kilocode-cli' || destApp === 'kilocode-cli') {
          // Cross-app duplication involving Kilocode
          
          // Case 1: Source is Kilocode
          if (app === 'kilocode-cli') {
             const provider = await kilocodeService.getProviderById(id);
             if (!provider) return { success: false, message: 'Source provider not found' };
             
             // Extract config from Kilocode provider
             const pConfig = provider.config || {};
             
             // Parse Opencode structure
             const options = (pConfig.options as Record<string, any>) || {};
             const models = (pConfig.models as Record<string, any>) || {};
             
             let apiKey = options.apiKey || (pConfig.apiKey as string) || '';
             let baseUrl = options.baseURL || options.baseUrl || (pConfig.baseUrl as string) || (pConfig.api as string) || '';
             let model = '';
             
             // Get the first model key if available
             const modelKeys = Object.keys(models);
             if (modelKeys.length > 0) {
               model = modelKeys[0];
             }
             
             // Fallbacks for legacy/flat config
             if (!apiKey) apiKey = (pConfig.openaiApiKey as string) || (pConfig.kilocodeToken as string) || (pConfig.litellmApiKey as string) || '';
             if (!baseUrl) baseUrl = (pConfig.openaiBaseUrl as string) || (pConfig.litellmBaseUrl as string) || '';
             if (!model) model = (pConfig.openaiModel as string) || (pConfig.model as string) || (pConfig.kilocodeModel as string) || (pConfig.litellmModelId as string) || '';
             
             // Extract usePromptCache
             let usePromptCache = false;
             if (model && models[model]) {
               usePromptCache = !!models[model].usePromptCache;
             } else {
               usePromptCache = (pConfig.litellmUsePromptCache as boolean) || false;
             }

             if (destApp === 'kilocode-cli') {
               // Duplicate within Kilocode
               await kilocodeService.addProvider({
                 id: newId,
                 name: newId,
                 apiUrl: baseUrl,
                 apiKey: apiKey,
                 model: model,
                 providerType: (pConfig.provider as string) || 'openai',
                 usePromptCache: usePromptCache,
               });
               return { success: true, message: `Successfully duplicated provider '${id}' to '${newId}'` };
             } else {
               // Duplicate from Kilocode to DB-based app (Claude, Gemini, Codex)
               const newParams = {
                 id: newId,
                 name: `${provider.name} (Copy)`,
                 apiUrl: baseUrl,
                 apiKey: apiKey,
                 app: destApp,
                 model: model,
                 websiteUrl: (pConfig.websiteUrl as string) || '',
                 notes: (pConfig.notes as string) || '',
               };
               
               return await this.addProvider(newParams);
             }
          }
          
          // Case 2: Target is Kilocode (Source is DB-based)
          if (destApp === 'kilocode-cli') {
             // Get source provider from DB
             const sourceProvider = await this.getProviderById(id, app);
             if (!sourceProvider) return { success: false, message: 'Source provider not found' };
             
             const pConfig = sourceProvider.config || {};
             let apiKey = '';
             let baseUrl = '';
             let model = '';
             
             // Extract based on source app
             if (app === 'claude') {
               apiKey = (pConfig.env as any)?.ANTHROPIC_AUTH_TOKEN || '';
               baseUrl = (pConfig.env as any)?.ANTHROPIC_BASE_URL || '';
               model = (pConfig.env as any)?.ANTHROPIC_MODEL || '';
             } else if (app === 'gemini') {
               apiKey = (pConfig.env as any)?.GEMINI_API_KEY || (pConfig.env as any)?.GOOGLE_API_KEY || '';
               baseUrl = (pConfig.env as any)?.GEMINI_BASE_URL || '';
               model = (pConfig.env as any)?.GEMINI_MODEL || '';
             } else if (app === 'codex') {
               apiKey = (pConfig.auth as any)?.OPENAI_API_KEY || '';
               // Extract from TOML config string would be needed here, simplified for now
               // In a real scenario, we'd reuse the parsing logic from getProviderById or similar
               // For now, let's assume we can get it if available or leave blank
             }
             
             await kilocodeService.addProvider({
               id: newId,
               name: newId,
               apiUrl: baseUrl,
               apiKey: apiKey,
               model: model,
             });
             
             return { success: true, message: `Successfully duplicated provider '${id}' to '${newId}' in Kilocode` };
          }
        }

        const dbPath = await this.getDbPath();
        
        // Check if source provider exists
        const checkSql = `SELECT id, name, settings_config, website_url, category, meta, cost_multiplier, provider_type, notes, sort_index, icon, icon_color, limit_daily_usd, limit_monthly_usd FROM providers WHERE id = '${id}' AND app_type = '${app}';`;
        const checkResult = await this.executeSqliteQuery(dbPath, checkSql);
        
        if (!checkResult.trim()) {
            return { success: false, message: `Provider '${id}' not found in app '${app}'` };
        }
        
        // Check if new ID already exists in destination app
        const checkNewSql = `SELECT id FROM providers WHERE id = '${newId}' AND app_type = '${destApp}';`;
        const checkNewResult = await this.executeSqliteQuery(dbPath, checkNewSql);
        
        if (checkNewResult.trim()) {
            return { success: false, message: `Provider with ID '${newId}' already exists in app '${destApp}'` };
        }
        
        // Parse source provider data
        const parts = checkResult.split('|');
        if (parts.length < 14) {
            return { success: false, message: 'Failed to parse source provider data' };
        }
        
        const sourceName = parts[1] || 'Provider';
        const sourceSettingsConfig = parts[2] || '{}';
        const sourceWebsiteUrl = parts[3] || '';
        const sourceCategory = parts[4] || 'custom';
        const sourceMeta = parts[5] || '{}';
        const sourceCostMultiplier = parts[6] || '1.0';
        const sourceProviderType = parts[7] || 'custom';
        const sourceNotes = parts[8] || '';
        const sourceSortIndex = parts[9] || '0';
        const sourceIcon = parts[10] || '';
        const sourceIconColor = parts[11] || '';
        const sourceLimitDaily = parts[12] || '';
        const sourceLimitMonthly = parts[13] || '';
        
        // Transform settings_config for the target app type
        let transformedSettingsConfig = sourceSettingsConfig;
        try {
            let settingsObj = JSON.parse(sourceSettingsConfig);
            settingsObj = this.transformSettingsConfigForApp(settingsObj, app, destApp);
            transformedSettingsConfig = JSON.stringify(settingsObj).replace(/'/g, "''");
        } catch {
            // Keep original if parsing fails
        }
        
        // Insert with new ID and destination app type
        const sql = `INSERT INTO providers (id, app_type, name, settings_config, website_url, category, meta, is_current, in_failover_queue, cost_multiplier, provider_type, notes, sort_index, icon, icon_color, limit_daily_usd, limit_monthly_usd, created_at)
                     VALUES ('${newId}', '${destApp}', '${sourceName.replace(/'/g, "''")} (Copy)', '${transformedSettingsConfig}', '${sourceWebsiteUrl.replace(/'/g, "''")}', '${sourceCategory}', '${sourceMeta.replace(/'/g, "''")}', 0, 0, '${sourceCostMultiplier}', '${sourceProviderType}', '${sourceNotes.replace(/'/g, "''")}', ${sourceSortIndex}, '${sourceIcon}', '${sourceIconColor}', ${sourceLimitDaily || 'NULL'}, ${sourceLimitMonthly || 'NULL'}, strftime('%s', 'now'));`;
        
        const result = await this.executeSqlite(dbPath, sql);
        
        if (result.success) {
            if (targetApp && targetApp !== app) {
                result.message = `Successfully copied provider '${id}' from ${app} to ${targetApp} as '${newId}'`;
            } else {
                result.message = `Successfully duplicated provider '${id}' to '${newId}'`;
            }
        }
        
        return result;
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
  }

  /**
   * Transform settings config from one app type to another
   */
  private transformSettingsConfigForApp(settings: Record<string, any>, sourceApp: string, targetApp: string): Record<string, any> {
    // Extract common values from source
    let apiKey = '';
    let baseUrl = '';
    let model = '';
    
    if (sourceApp === 'claude') {
        apiKey = settings.env?.ANTHROPIC_AUTH_TOKEN || '';
        baseUrl = settings.env?.ANTHROPIC_BASE_URL || '';
        model = settings.env?.ANTHROPIC_MODEL || '';
    } else if (sourceApp === 'codex') {
        apiKey = settings.auth?.OPENAI_API_KEY || '';
        // Extract base_url from config TOML if present
        const baseUrlMatch = settings.config?.match(/base_url\s*=\s*"([^"]+)"/);
        baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';
        const modelMatch = settings.config?.match(/model\s*=\s*"([^"]+)"/);
        model = modelMatch ? modelMatch[1] : '';
    } else if (sourceApp === 'gemini') {
        apiKey = settings.env?.GEMINI_API_KEY || settings.env?.GOOGLE_API_KEY || '';
        baseUrl = settings.env?.GEMINI_BASE_URL || '';
        model = settings.env?.GEMINI_MODEL || '';
    }
    
    // Build new config for target app
    if (targetApp === 'claude') {
        return {
            env: {
                ANTHROPIC_AUTH_TOKEN: apiKey,
                ANTHROPIC_BASE_URL: baseUrl,
                ANTHROPIC_MODEL: model || 'claude-3-5-sonnet-20241022',
            }
        };
    } else if (targetApp === 'codex') {
        return {
            auth: {
                OPENAI_API_KEY: apiKey
            },
            config: `model = "${model || 'gpt-4o'}"\nmodel_provider = "openai-chat-completions"\npreferred_auth_method = "apikey"\n\n[model_providers.openai-chat-completions]\nname = "OpenAI"\nbase_url = "${baseUrl}"\nwire_api = "responses"\n`
        };
    } else if (targetApp === 'gemini') {
        return {
            env: {
                GEMINI_API_KEY: apiKey,
                GOOGLE_API_KEY: apiKey,
                GEMINI_BASE_URL: baseUrl,
                GEMINI_MODEL: model || 'gemini-2.0-flash',
            }
        };
    }
    
    // Default: return as-is
    return settings;
  }

  /**
   * Run speedtest for a provider
   */
  async speedtestProvider(id: string, app: string = 'claude'): Promise<{ success: boolean; message: string; latency?: number }> {
      try {
          const args = [...this.getAppFlagArgs(app), 'provider', 'speedtest', id];
          const result = await this.execute(args);
          
          if (result.exitCode === 0) {
              // Parse latency from output if possible, e.g., "Latency: 150ms"
              const match = result.stdout.match(/Latency:\s*(\d+)ms/);
              const latency = match ? parseInt(match[1]) : undefined;
              return { success: true, message: result.stdout, latency };
          } else {
              return { success: false, message: result.stderr || result.stdout };
          }
      } catch (error) {
          return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
          };
      }
  }

  /**
   * Get DB path from config
   */
  private async getDbPath(): Promise<string> {
    try {
      const result = await this.execute(['config', 'path']);
      const match = result.stdout.match(/DB file:\s*(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch (e) {
      // Ignore error and fallback
    }
    return `${process.env.HOME}/.cc-switch/cc-switch.db`;
  }

  /**
   * Execute sqlite3 command
   */
  private async executeSqlite(dbPath: string, sql: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const child = spawn('sqlite3', [dbPath, sql]);
      let stderr = '';
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: 'Operation completed successfully' });
        } else {
          resolve({ success: false, message: `SQLite operation failed: ${stderr}` });
        }
      });

      child.on('error', (error) => {
        resolve({ success: false, message: `Failed to execute sqlite3: ${error.message}` });
      });
    });
  }

  /**
   * Execute sqlite3 query and return result
   */
  private async executeSqliteQuery(dbPath: string, sql: string): Promise<string> {
    return new Promise((resolve) => {
      const child = spawn('sqlite3', [dbPath, sql]);
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', () => {
        resolve(stdout.trim());
      });

      child.on('error', () => {
        resolve('');
      });
    });
  }

  /**
   * Execute sqlite3 query and return all results as JSON array
   */
  private async executeSqliteQueryJsonAll(dbPath: string, sql: string): Promise<any[]> {
    return new Promise((resolve) => {
      // Use -json flag to get JSON output
      const child = spawn('sqlite3', ['-json', dbPath, sql]);
      let stdout = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', () => {
        try {
          if (stdout.trim()) {
            const result = JSON.parse(stdout.trim());
            if (Array.isArray(result)) {
              resolve(result);
            } else {
              resolve([result]);
            }
          } else {
            resolve([]);
          }
        } catch (e) {
          console.error('Failed to parse sqlite JSON output:', e);
          resolve([]);
        }
      });

      child.on('error', () => {
        resolve([]);
      });
    });
  }

  /**
   * Execute sqlite3 query and return result as JSON
   * This is more reliable for columns that contain JSON data
   */
  private async executeSqliteQueryJson(dbPath: string, sql: string): Promise<Record<string, any> | null> {
    return new Promise((resolve) => {
      // Use -json flag to get JSON output
      const child = spawn('sqlite3', ['-json', dbPath, sql]);
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', () => {
        try {
          if (stdout.trim()) {
            const result = JSON.parse(stdout.trim());
            // sqlite3 -json returns an array, return first row if exists
            if (Array.isArray(result) && result.length > 0) {
              resolve(result[0]);
            } else if (!Array.isArray(result) && result) {
              resolve(result);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error('Failed to parse sqlite JSON output:', e);
          resolve(null);
        }
      });

      child.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Edit a provider
   */

  /**
   * Duplicate a provider
   */

  /**
   * Speedtest a provider
   */

  /**
   * Delete a provider
   */
  async deleteProvider(providerId: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const appType = app || 'claude';
      
      if (appType === 'kilocode-cli') {
        await kilocodeService.deleteProvider(providerId);
        return { success: true, message: `Deleted provider: ${providerId}` };
      }

      const dbPath = await this.getDbPath();
      
      // Check if this is the current provider
      const checkCurrentSql = `SELECT is_current FROM providers WHERE id = '${providerId}' AND app_type = '${appType}';`;
      const checkResult = await this.executeSqliteQuery(dbPath, checkCurrentSql);
      
      if (checkResult.includes('1')) {
        return {
          success: false,
          message: 'Cannot delete the current active provider. Please switch to another provider first.',
        };
      }
      
      // Delete using direct SQLite access
      const sql = `DELETE FROM providers WHERE id = '${providerId}' AND app_type = '${appType}';`;
      const result = await this.executeSqlite(dbPath, sql);
      
      if (result.success) {
        configStorage.addLog({
          level: 'info',
          operation: 'delete_provider',
          message: `Deleted provider: ${providerId}`,
          details: { providerId, appType },
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get current provider
   */
  async getCurrentProvider(app?: string): Promise<{ id: string; name: string } | null> {
    try {
      const args = [...this.getAppFlagArgs(app), 'provider', 'current'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return null;
      }

      // Parse the output to extract provider info
      const lines = result.stdout.split('\n');
      for (const line of lines) {
        if (line.includes('Current Provider')) {
          const match = line.match(/Current Provider:\s*(\S+)/);
          if (match && match[1]) {
            return { id: match[1], name: match[1] };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting current provider:', error);
      return null;
    }
  }

  /**
   * Get a single provider's full configuration by ID
   */
  async getProviderById(providerId: string, app?: string): Promise<Provider | null> {
    try {
      const appType = app || 'claude';
      
      if (appType === 'kilocode-cli') {
        return await kilocodeService.getProviderById(providerId);
      }

      const dbPath = await this.getDbPath();
      
      const sql = `SELECT id, name, settings_config, website_url, notes, sort_index, is_current FROM providers WHERE id = '${providerId}' AND app_type = '${appType}';`;
      const result = await this.executeSqliteQueryJson(dbPath, sql);
      
      if (!result) {
        return null;
      }
      
      const id = result.id;
      const name = result.name;
      let settingsConfig: Record<string, any> = {};
      try {
        if (result.settings_config) {
          if (typeof result.settings_config === 'string') {
            settingsConfig = JSON.parse(result.settings_config);
          } else {
            settingsConfig = result.settings_config;
          }
        }
      } catch {
        // Ignore parse errors
      }
      
      return {
        id,
        name,
        type: this.inferProviderType(id),
        isActive: result.is_current === 1 || result.is_current === true,
        config: {
          ...settingsConfig,
          websiteUrl: result.website_url || '',
          notes: result.notes || '',
          sortIndex: result.sort_index || 0,
        },
      };
    } catch (error) {
      console.error('Error getting provider by ID:', error);
      return null;
    }
  }

  // ============================================
  // MCP Server Management Methods
  // ============================================

  /**
   * List MCP servers
   */
  async listMcpServers(app?: string): Promise<Array<{
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>> {
    try {
      const args = [...this.getAppFlagArgs(app), 'mcp', 'list'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list MCP servers: ${result.stderr}`);
      }

      return this.parseMcpList(result.stdout);
    } catch (error) {
      console.error('Error listing MCP servers:', error);
      return [];
    }
  }

  /**
   * Parse MCP list output
   */
  private parseMcpList(output: string): Array<{
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }> {
    const servers: Array<{
      id: string;
      name: string;
      command: string;
      args?: string[];
      env?: Record<string, string>;
    }> = [];

    if (output.includes('No MCP servers found')) {
      return servers;
    }

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        if (trimmed.includes('┌') || trimmed.includes('└') || trimmed.includes('╞') ||
            trimmed.includes('═') || trimmed.includes('─') || trimmed.includes('ID') ||
            trimmed.includes('Name')) {
          continue;
        }
        
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 3) {
          const id = cells[1];
          const name = cells[2];
          const command = cells[3] || '';
          
          if (id && id !== '' && !id.includes('ℹ') && !id.includes('→')) {
            servers.push({
              id,
              name,
              command,
            });
          }
        }
      }
    }

    return servers;
  }

  /**
   * Add MCP server
   */
  async addMcpServer(params: {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    app?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const id = params.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const serverConfig = {
        command: params.command,
        args: params.args || [],
        env: params.env || {},
        disabled: false,
        autoUpdate: false
      };
      
      const serverConfigStr = JSON.stringify(serverConfig);
      
      // Determine which apps to enable for
      const enableClaude = params.app === 'claude' || !params.app ? 1 : 0;
      const enableCodex = params.app === 'codex' ? 1 : 0;
      const enableGemini = params.app === 'gemini' ? 1 : 0;
      const enableOpencode = params.app === 'opencode' ? 1 : 0;
      const enableKilocodeCli = params.app === 'kilocode-cli' ? 1 : 0;
      const enableAmp = params.app === 'amp' ? 1 : 0;

      const sql = `INSERT OR REPLACE INTO mcp_servers (id, name, server_config, description, enabled_claude, enabled_codex, enabled_gemini, enabled_opencode, enabled_kilocode_cli, enabled_amp) VALUES ('${id}', '${params.name}', '${serverConfigStr.replace(/'/g, "''")}', '', ${enableClaude}, ${enableCodex}, ${enableGemini}, ${enableOpencode}, ${enableKilocodeCli}, ${enableAmp});`;

      const dbPath = await this.getDbPath();
      return await this.executeSqlite(dbPath, sql);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Edit MCP server
   */

  /**
   * Toggle MCP server
   */
  async toggleMcpServer(id: string, enabled: boolean, app: string): Promise<{ success: boolean; message: string }> {
    try {
      let column = '';
      if (app === 'claude') column = 'enabled_claude';
      else if (app === 'codex') column = 'enabled_codex';
      else if (app === 'gemini') column = 'enabled_gemini';
      else if (app === 'opencode') column = 'enabled_opencode';
      else if (app === 'kilocode-cli') column = 'enabled_kilocode_cli';
      else if (app === 'amp') column = 'enabled_amp';
      else throw new Error(`Invalid app: ${app}`);

      const val = enabled ? 1 : 0;
      const sql = `UPDATE mcp_servers SET ${column} = ${val} WHERE id = '${id}';`;

      const dbPath = await this.getDbPath();
      return await this.executeSqlite(dbPath, sql);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Delete MCP server
   */
  async deleteMcpServer(serverId: string, _app?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Use direct DB delete instead of CLI
      const sql = `DELETE FROM mcp_servers WHERE id = '${serverId}';`;
      const dbPath = await this.getDbPath();
      return await this.executeSqlite(dbPath, sql);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Toggle MCP server status (enable/disable) for an app
   */

  /**
   * Edit MCP server
   */

  /**
   * Sync MCP servers
   */
  async syncMcpServers(app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'mcp', 'sync'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to sync MCP servers: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: 'Successfully synced MCP servers',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Toggle MCP server status (enable/disable) for an app
   */

  /**
   * Edit MCP server
   */
  async editMcpServer(params: {
      id: string;
      name?: string;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
  }): Promise<{ success: boolean; message: string }> {
      try {
          const dbPath = await this.getDbPath();
          
          if (params.name) {
              const sql = `UPDATE mcp_servers SET name = '${params.name}' WHERE id = '${params.id}';`;
              await this.executeSqlite(dbPath, sql);
          }

          if (params.command || params.args || params.env) {
              // We can't easily merge without reading.
              // Let's try to read using raw execute
              const readCmd = ['sqlite3', dbPath, `SELECT server_config FROM mcp_servers WHERE id = '${params.id}';`];
              const readResult = await this.execute(readCmd);
              
              if (readResult.exitCode === 0 && readResult.stdout.trim()) {
                  let config = JSON.parse(readResult.stdout.trim());
                  
                  if (params.command) config.command = params.command;
                  if (params.args) config.args = params.args;
                  if (params.env) config.env = params.env;
                  
                  const configStr = JSON.stringify(config);
                  const updateSql = `UPDATE mcp_servers SET server_config = '${configStr.replace(/'/g, "''")}' WHERE id = '${params.id}';`;
                  await this.executeSqlite(dbPath, updateSql);
              }
          }
          
          return { success: true, message: 'MCP server updated' };

      } catch (error) {
          return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
          };
      }
  }

  // ============================================
  // Prompts Management Methods
  // ============================================

  /**
   * List prompts
   */
  async listPrompts(app?: string): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    updated?: string;
  }>> {
    try {
      const args = [...this.getAppFlagArgs(app), 'prompts', 'list'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list prompts: ${result.stderr}`);
      }

      return this.parsePromptsList(result.stdout);
    } catch (error) {
      console.error('Error listing prompts:', error);
      return [];
    }
  }

  /**
   * Parse prompts list output
   */
  private parsePromptsList(output: string): Array<{
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    updated?: string;
  }> {
    const prompts: Array<{
      id: string;
      name: string;
      description?: string;
      isActive: boolean;
      updated?: string;
    }> = [];

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        if (trimmed.includes('┌') || trimmed.includes('└') || trimmed.includes('╞') ||
            trimmed.includes('═') || trimmed.includes('─') || trimmed.includes('ID') ||
            trimmed.includes('Name')) {
          continue;
        }
        
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 3) {
          const isActive = cells[0].includes('✓');
          const id = cells[1];
          const name = cells[2];
          const description = cells[3] || '';
          const updated = cells[4] || '';
          
          if (id && id !== '' && !id.includes('ℹ') && !id.includes('→')) {
            prompts.push({
              id,
              name,
              description,
              isActive,
              updated,
            });
          }
        }
      }
    }

    return prompts;
  }


  /**
   * Activate a prompt
   */
  async activatePrompt(promptId: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'prompts', 'activate', promptId];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to activate prompt: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully activated prompt: ${promptId}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Deactivate the current prompt
   */
  async deactivatePrompt(app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'prompts', 'deactivate'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to deactivate prompt: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: 'Successfully deactivated prompt',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async createPrompt(params: {
      id: string;
      name: string;
      content: string;
      description?: string;
      app?: string;
  }): Promise<{ success: boolean; message: string }> {
      try {
          // Check for existing ID
          if (!/^[a-zA-Z0-9_-]+$/.test(params.id)) {
              return { success: false, message: 'Invalid ID format' };
          }
          
          const app = params.app || 'claude';
          const description = params.description || '';
          
          const sql = `INSERT INTO prompts (id, app_type, name, content, description, enabled, created_at, updated_at) VALUES ('${params.id}', '${app}', '${params.name}', '${params.content.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', 1, strftime('%s', 'now'), strftime('%s', 'now'));`;
          
          const dbPath = await this.getDbPath();
          return await this.executeSqlite(dbPath, sql);

      } catch (error) {
          return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
          };
      }
  }

  async editPrompt(id: string, params: {
    name?: string;
    content?: string;
    description?: string;
    app?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const app = params.app || 'claude';
      let updates: string[] = [];
      
      if (params.name) updates.push(`name = '${params.name.replace(/'/g, "''")}'`);
      if (params.content) updates.push(`content = '${params.content.replace(/'/g, "''")}'`);
      if (params.description !== undefined) updates.push(`description = '${params.description.replace(/'/g, "''")}'`);
      updates.push(`updated_at = strftime('%s', 'now')`);
      
      if (updates.length === 1) return { success: true, message: 'No changes provided' };
      
      const sql = `UPDATE prompts SET ${updates.join(', ')} WHERE id = '${id}' AND app_type = '${app}';`;
      const dbPath = await this.getDbPath();
      return await this.executeSqlite(dbPath, sql);

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deletePrompt(id: string, app: string = 'claude'): Promise<{ success: boolean; message: string }> {
      try {
          const sql = `DELETE FROM prompts WHERE id = '${id}' AND app_type = '${app}';`;
          const dbPath = await this.getDbPath();
          return await this.executeSqlite(dbPath, sql);
      } catch (error) {
          return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
          };
      }
  }



  // ============================================
  // Skills Management Methods
  // ============================================

  /**
   * List skills
   */
  async listSkills(app?: string): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    installed: boolean;
  }>> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'list'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list skills: ${result.stderr}`);
      }

      return this.parseSkillsList(result.stdout);
    } catch (error) {
      console.error('Error listing skills:', error);
      return [];
    }
  }


  /**
   * Parse skills list output
   */
  private parseSkillsList(output: string): Array<{
    id: string;
    name: string;
    description?: string;
    installed: boolean;
  }> {
    const skills: Array<{
      id: string;
      name: string;
      description?: string;
      installed: boolean;
    }> = [];

    if (output.includes('No installed skills found')) {
      return skills;
    }

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        if (trimmed.includes('┌') || trimmed.includes('└') || trimmed.includes('╞') ||
            trimmed.includes('═') || trimmed.includes('─') || trimmed.includes('ID') ||
            trimmed.includes('Name')) {
          continue;
        }
        
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 2) {
          const id = cells[0];
          const name = cells[1];
          const description = cells[2] || '';
          
          if (id && id !== '' && !id.includes('ℹ') && !id.includes('→')) {
            skills.push({
              id,
              name,
              description,
              installed: true,
            });
          }
        }
      }
    }

    return skills;
  }

  /**
   * Install a skill
   */
  async installSkill(skillName: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'install', skillName];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to install skill: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully installed skill: ${skillName}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Uninstall a skill
   */
  async uninstallSkill(skillName: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'uninstall', skillName];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to uninstall skill: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully uninstalled skill: ${skillName}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Search skills
   */
  async searchSkills(query: string): Promise<Array<{
    name: string;
    description: string;
    installed: boolean;
  }>> {
    try {
      const result = await this.execute(['skills', 'search', query]);
      
      if (result.exitCode !== 0) {
        return [];
      }

      // Parse search output
      // Format:
      // name  description  [installed]
      const skills: Array<{ name: string; description: string; installed: boolean }> = [];
      const lines = result.stdout.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Name') || trimmed.includes('───')) continue;
        
        // Simple parsing assuming columns are separated by multiple spaces
        // This might need adjustment based on actual output
        const parts = trimmed.split(/\s{2,}/);
        if (parts.length >= 2) {
          const name = parts[0];
          const description = parts[1];
          const installed = line.includes('[installed]');
          
          skills.push({ name, description, installed });
        }
      }
      
      return skills;
    } catch (error) {
      console.error('Error searching skills:', error);
      return [];
    }
  }

  /**
   * List skill repos
   */
  async listSkillRepos(): Promise<Array<{ owner: string; name: string; branch: string; enabled: boolean }>> {
    try {
      const result = await this.execute(['skills', 'repos', 'list']);
      
      if (result.exitCode !== 0) {
        return [];
      }

      // Parse repos list
      const repos: Array<{ owner: string; name: string; branch: string; enabled: boolean }> = [];
      const lines = result.stdout.split('\n');
      
      for (const line of lines) {
        if (line.includes('┆')) {
           // Table format
           const cells = line.split('┆').map(c => c.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
           if (cells.length >= 3) {
             const repoStr = cells[0]; // owner/name
             const branch = cells[1];
             const enabled = cells[2].includes('✓');
             
             const [owner, name] = repoStr.split('/');
             if (owner && name) {
               repos.push({ owner, name, branch, enabled });
             }
           }
        }
      }
      
      return repos;
    } catch (error) {
      console.error('Error listing skill repos:', error);
      return [];
    }
  }

  /**
   * Add skill repo
   */
  async addSkillRepo(repo: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.execute(['skills', 'repos', 'add', repo]);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to add repo: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully added repo: ${repo}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Remove skill repo
   */
  async removeSkillRepo(repo: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.execute(['skills', 'repos', 'remove', repo]);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to remove repo: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully removed repo: ${repo}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Enable a skill
   */
  async enableSkill(skillName: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'enable', skillName];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to enable skill: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully enabled skill: ${skillName}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Disable a skill
   */
  async disableSkill(skillName: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'disable', skillName];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to disable skill: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully disabled skill: ${skillName}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Discover available skills from enabled repos
   */
  async discoverSkills(app?: string): Promise<Array<{
    name: string;
    description: string;
    installed: boolean;
  }>> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'discover'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return [];
      }

      return this.parseSkillsDiscover(result.stdout);
    } catch (error) {
      console.error('Error discovering skills:', error);
      return [];
    }
  }

  /**
   * Parse skills discover output
   */
  private parseSkillsDiscover(output: string): Array<{
    name: string;
    description: string;
    installed: boolean;
  }> {
    const skills: Array<{ name: string; description: string; installed: boolean }> = [];

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) continue;
      
      // Skip table borders and headers
      if (trimmed.includes('Directory') || trimmed.includes('Name') || 
          /^[┌┐└┘├┤┬┴┼─═│║╞╡╪╤╧╟╢╥╨╫╬╭╮╯╰╱╲╳╌]+$/.test(trimmed)) {
        continue;
      }
      
      // Handle table format with ┆ separator
      if (trimmed.includes('┆')) {
        // Skip lines that are purely box drawing characters
        if (/^[┌┐└┘├┤┬┴┼─═│║╞╡╪╤╧╟╢╥╨╫╬╭╮╯╰╱╲╳╌]+$/.test(trimmed)) {
          continue;
        }
        
        // Split by ┆ and clean up cells
        const cells = trimmed.split('┆').map(cell => cell.trim()).filter(cell => cell);
        
        if (cells.length >= 2) {
          // First cell is usually empty or has install indicator
          // Second cell is Directory (which is the skill ID)
          // Third cell is Name
          const id = cells[1] || '';
          const name = cells[2] || cells[1] || '';
          
          if (id && id !== '' && !id.includes('ℹ') && !id.includes('→') && !id.includes('Available')) {
            skills.push({ 
              name: id, 
              description: name !== id ? name : '', 
              installed: false 
            });
          }
        }
      } else if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('===')) {
        // Simple format parsing
        const parts = trimmed.split(/\s{2,}/);
        if (parts.length >= 1 && parts[0]) {
          const name = parts[0];
          const description = parts[1] || '';
          const installed = trimmed.includes('[installed]');
          
          if (name && !name.includes('ℹ') && !name.includes('→')) {
            skills.push({ name, description, installed });
          }
        }
      }
    }

    return skills;
  }

  /**
   * Sync enabled skills to app skills dirs
   */
  async syncSkills(app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'sync'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to sync skills: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: result.stdout || 'Successfully synced skills',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Scan unmanaged skills in app skills dirs
   */
  async scanUnmanagedSkills(app?: string): Promise<Array<{
    name: string;
    path: string;
    app: string;
  }>> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'scan-unmanaged'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return [];
      }

      return this.parseUnmanagedSkills(result.stdout);
    } catch (error) {
      console.error('Error scanning unmanaged skills:', error);
      return [];
    }
  }

  /**
   * Parse unmanaged skills output
   */
  private parseUnmanagedSkills(output: string): Array<{
    name: string;
    path: string;
    app: string;
  }> {
    const skills: Array<{ name: string; path: string; app: string }> = [];

    if (output.includes('No unmanaged skills found')) {
      return skills;
    }

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 3) {
          const name = cells[0];
          const path = cells[1];
          const app = cells[2];
          
          if (name && name !== '' && !name.includes('ℹ') && !name.includes('→') && name !== 'Name') {
            skills.push({ name, path, app });
          }
        }
      }
    }

    return skills;
  }

  /**
   * Import unmanaged skills from app skills dirs into SSOT
   */
  async importSkillsFromApps(app?: string): Promise<{ success: boolean; message: string; imported?: string[] }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'import-from-apps'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to import skills: ${result.stderr || result.stdout}`,
        };
      }

      // Try to parse imported skill names from output
      const imported: string[] = [];
      const importMatch = result.stdout.match(/Imported:\s*(.+)/i);
      if (importMatch) {
        imported.push(...importMatch[1].split(',').map(s => s.trim()));
      }

      return {
        success: true,
        message: result.stdout || 'Successfully imported skills',
        imported,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get skill information
   */
  async getSkillInfo(skillName: string, app?: string): Promise<{
    name: string;
    description?: string;
    version?: string;
    author?: string;
    path?: string;
    enabled?: boolean;
    installed?: boolean;
  } | null> {
    try {
      const args = [...this.getAppFlagArgs(app), 'skills', 'info', skillName];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return null;
      }

      return this.parseSkillInfo(result.stdout);
    } catch (error) {
      console.error('Error getting skill info:', error);
      return null;
    }
  }

  /**
   * Parse skill info output
   */
  private parseSkillInfo(output: string): {
    name: string;
    description?: string;
    version?: string;
    author?: string;
    path?: string;
    enabled?: boolean;
    installed?: boolean;
  } | null {
    const info: Record<string, string | boolean> = {};
    
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      const colonIndex = trimmed.indexOf(':');
      
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim().toLowerCase();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        if (key === 'name') info.name = value;
        else if (key === 'description') info.description = value;
        else if (key === 'version') info.version = value;
        else if (key === 'author') info.author = value;
        else if (key === 'path') info.path = value;
        else if (key === 'enabled') info.enabled = value.toLowerCase() === 'true' || value === 'yes';
        else if (key === 'installed') info.installed = value.toLowerCase() === 'true' || value === 'yes';
      }
    }

    return info.name ? info as any : null;
  }

  /**
   * Get or set the skills sync method
   */
  async getSyncMethod(): Promise<{ method: string }> {
    try {
      const result = await this.execute(['skills', 'sync-method']);
      
      if (result.exitCode !== 0) {
        return { method: 'auto' };
      }

      // Parse the sync method from output
      const match = result.stdout.match(/(?:method|sync.method):\s*(\w+)/i);
      if (match && match[1]) {
        return { method: match[1].toLowerCase() };
      }

      return { method: 'auto' };
    } catch (error) {
      console.error('Error getting sync method:', error);
      return { method: 'auto' };
    }
  }

  /**
   * Set the skills sync method
   */
  async setSyncMethod(method: 'auto' | 'symlink' | 'copy'): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.execute(['skills', 'sync-method', method]);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to set sync method: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully set sync method to: ${method}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  // ============================================
  // Config Management Methods
  // ============================================

  /**
   * Export configuration
   */
  async exportConfig(outputPath: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'config', 'export', outputPath];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to export config: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully exported config to: ${outputPath}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Import configuration
   */
  async importConfig(inputPath: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'config', 'import', inputPath];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to import config: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully imported config from: ${inputPath}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Backup configuration
   */
  async backupConfig(app?: string): Promise<{ success: boolean; message: string; backupPath?: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'config', 'backup'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to backup config: ${result.stderr || result.stdout}`,
        };
      }

      // Try to extract backup path from output
      const backupPathMatch = result.stdout.match(/(?:saved to|created at|backed up to):\s*(.+)/i);
      const backupPath = backupPathMatch ? backupPathMatch[1].trim() : undefined;

      return {
        success: true,
        message: 'Successfully created config backup',
        backupPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Restore configuration
   */
  async restoreConfig(backupPath: string, app?: string): Promise<{ success: boolean; message: string }> {
    try {
      const args = [...this.getAppFlagArgs(app), 'config', 'restore', backupPath];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Failed to restore config: ${result.stderr || result.stdout}`,
        };
      }

      return {
        success: true,
        message: `Successfully restored config from: ${backupPath}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get config path
   */
  async getConfigPath(app?: string): Promise<string | null> {
    try {
      const args = [...this.getAppFlagArgs(app), 'config', 'path'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        return null;
      }

      return result.stdout.trim();
    } catch (error) {
      console.error('Error getting config path:', error);
      return null;
    }
  }

  // ============================================
  // Environment Variables Management Methods
  // ============================================

  /**
   * List environment variables
   */
  async listEnvVars(app?: string): Promise<Array<{
    variable: string;
    value: string;
    sourceType: string;
    sourceLocation: string;
  }>> {
    try {
      const args = [...this.getAppFlagArgs(app), 'env', 'list'];
      
      const result = await this.execute(args);
      
      if (result.exitCode !== 0) {
        throw new Error(`Failed to list environment variables: ${result.stderr}`);
      }

      return this.parseEnvList(result.stdout);
    } catch (error) {
      console.error('Error listing environment variables:', error);
      return [];
    }
  }

  /**
   * Parse environment variables list output
   */
  private parseEnvList(output: string): Array<{
    variable: string;
    value: string;
    sourceType: string;
    sourceLocation: string;
  }> {
    const envVars: Array<{
      variable: string;
      value: string;
      sourceType: string;
      sourceLocation: string;
    }> = [];

    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('┆')) {
        if (trimmed.includes('┌') || trimmed.includes('└') || trimmed.includes('╞') ||
            trimmed.includes('═') || trimmed.includes('─') || trimmed.includes('Variable') ||
            trimmed.includes('╌')) {
          continue;
        }
        
        const cells = trimmed.split('┆').map(cell => cell.trim().replace(/[│┌┐└┘╞═╪╡║]/g, '').trim());
        if (cells.length >= 4) {
          const variable = cells[0];
          const value = cells[1];
          const sourceType = cells[2];
          const sourceLocation = cells[3];
          
          if (variable && variable !== '' && !variable.includes('ℹ') && !variable.includes('→')) {
            envVars.push({
              variable,
              value,
              sourceType,
              sourceLocation,
            });
          }
        }
      }
    }

    return envVars;
  }

  /**
   * Get version
   */
  async getVersion(): Promise<string> {
    try {
      const result = await this.execute(['--version']);
      
      if (result.exitCode !== 0) {
        return 'unknown';
      }

      return result.stdout.trim();
    } catch (error) {
      console.error('Error getting version:', error);
      return 'unknown';
    }
  }
}

// Export singleton instance
export const ccSwitchAdapter = new CCSwitchAdapter();
