import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Provider } from '../types/index.js';

const CONFIG_PATH = path.join(os.homedir(), '.kilocode/cli/config.json');

interface KilocodeProviderConfig {
  id: string;
  provider: string;
  [key: string]: any;
}

interface KilocodeConfig {
  provider: string;
  providers: KilocodeProviderConfig[];
  [key: string]: any;
}

export class KilocodeService {
  private async readConfig(): Promise<KilocodeConfig> {
    try {
      const content = await fs.readFile(CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading Kilocode config:', error);
      // Return a default structure if file doesn't exist or is invalid
      return {
        provider: 'default',
        providers: []
      };
    }
  }

  private async writeConfig(config: KilocodeConfig): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(CONFIG_PATH);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing Kilocode config:', error);
      throw new Error('Failed to write Kilocode configuration');
    }
  }

  async listProviders(): Promise<Provider[]> {
    try {
      const config = await this.readConfig();
      const currentId = config.provider;

      if (!config.providers || !Array.isArray(config.providers)) {
        return [];
      }

      return config.providers.map(p => ({
        id: p.id,
        name: p.id, // Kilocode config uses ID as name usually
        type: 'custom',
        isActive: p.id === currentId,
        config: {
          ...p,
          app: 'kilocode-cli' // Ensure app type is set for UI
        }
      }));
    } catch (error) {
      console.error('Error listing Kilocode providers:', error);
      return [];
    }
  }

  async getProviderById(id: string): Promise<Provider | null> {
    const config = await this.readConfig();
    const provider = config.providers?.find(p => p.id === id);
    
    if (!provider) return null;

    return {
      id: provider.id,
      name: provider.id,
      type: 'custom',
      isActive: config.provider === id,
      config: {
        ...provider,
        app: 'kilocode-cli' // Ensure app type is set for UI
      }
    };
  }

  async switchProvider(id: string): Promise<void> {
    const config = await this.readConfig();
    const exists = config.providers?.some(p => p.id === id);
    
    if (!exists) {
      throw new Error(`Provider '${id}' not found in Kilocode configuration`);
    }
    
    config.provider = id;
    await this.writeConfig(config);
  }

  async addProvider(params: {
    id: string;
    name: string;
    apiUrl: string;
    apiKey?: string;
    model?: string;
    providerType?: string;
    usePromptCache?: boolean;
    [key: string]: any;
  }): Promise<void> {
    console.log('Adding Kilocode provider:', JSON.stringify(params, null, 2));
    const config = await this.readConfig();
    
    if (!config.providers) {
      config.providers = [];
    }

    if (config.providers.some(p => p.id === params.id)) {
      throw new Error(`Provider '${params.id}' already exists`);
    }

    // Construct new provider object
    let newProvider: KilocodeProviderConfig;

    if (params.providerType === 'litellm') {
      newProvider = {
        id: params.id,
        provider: 'litellm',
        litellmBaseUrl: params.apiUrl,
        litellmApiKey: params.apiKey,
        litellmModelId: params.model || 'gpt-4o',
        litellmUsePromptCache: params.usePromptCache || false,
      };
    } else {
      // Default to OpenAI-compatible structure
      newProvider = {
        id: params.id,
        provider: 'openai',
        openaiBaseUrl: params.apiUrl,
        openaiApiKey: params.apiKey,
        openaiModel: params.model || 'gpt-4o',
      };
    }
    
    config.providers.push(newProvider);
    await this.writeConfig(config);
  }

  async editProvider(id: string, params: {
    name?: string;
    apiUrl?: string;
    apiKey?: string;
    model?: string;
    providerType?: string;
    usePromptCache?: boolean;
    [key: string]: any;
  }): Promise<void> {
    console.log('Editing Kilocode provider:', id, JSON.stringify(params, null, 2));
    const config = await this.readConfig();
    
    if (!config.providers) return;

    const index = config.providers.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Provider '${id}' not found`);
    }

    const provider = config.providers[index];
    
    // Update provider type if specified
    if (params.providerType) {
      provider.provider = params.providerType;
    }
    
    // Update fields based on provider type
    if (provider.provider === 'kilocode') {
      if (params.apiKey) provider.kilocodeToken = params.apiKey;
      if (params.model) provider.kilocodeModel = params.model;
    } else if (provider.provider === 'openai') {
      if (params.apiUrl) provider.openaiBaseUrl = params.apiUrl;
      if (params.apiKey) provider.openaiApiKey = params.apiKey;
      if (params.model) provider.openaiModel = params.model;
    } else if (provider.provider === 'litellm') {
      if (params.apiUrl) provider.litellmBaseUrl = params.apiUrl;
      if (params.apiKey) provider.litellmApiKey = params.apiKey;
      if (params.model) provider.litellmModelId = params.model;
      if (params.usePromptCache !== undefined) provider.litellmUsePromptCache = params.usePromptCache;
    } else {
      // Generic fallback
      if (params.apiUrl) provider.baseUrl = params.apiUrl;
      if (params.apiKey) provider.apiKey = params.apiKey;
      if (params.model) provider.model = params.model;
    }

    config.providers[index] = provider;
    await this.writeConfig(config);
  }

  async deleteProvider(id: string): Promise<void> {
    const config = await this.readConfig();
    
    if (!config.providers) return;

    if (config.provider === id) {
      throw new Error('Cannot delete the current active provider');
    }

    config.providers = config.providers.filter(p => p.id !== id);
    await this.writeConfig(config);
  }
}

export const kilocodeService = new KilocodeService();
