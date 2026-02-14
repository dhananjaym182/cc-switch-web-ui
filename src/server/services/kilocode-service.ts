import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Provider } from '../types/index.js';

interface OpencodeModel {
  name?: string;
  family?: string;
  reasoning?: boolean;
  supportsStreaming?: boolean;
  limit?: { context?: number; output?: number };
  modalities?: { input?: string[]; output?: string[] };
  [key: string]: any;
}

interface OpencodeProvider {
  name?: string;
  npm?: string;
  api?: string;
  models?: Record<string, OpencodeModel>;
  options?: Record<string, any>;
  [key: string]: any;
}

interface OpencodeConfig {
  $schema?: string;
  disabled_providers?: string[];
  provider: Record<string, OpencodeProvider>;
  [key: string]: any;
}

export class KilocodeService {
  private providerSourceMap: Map<string, string> = new Map();

  private getCandidates(): string[] {
    const home = os.homedir();
    return [
      path.join(home, '.config/kilo/opencode.json'),
      path.join(home, '.config/kilo/opencode.jsonc'),
      path.join(home, '.config/kilocode/kilocode.json'),
      path.join(home, '.config/kilocode/kilocode.jsonc')
    ];
  }

  private async getConfigPaths(): Promise<string[]> {
    const existing: string[] = [];
    for (const p of this.getCandidates()) {
      try {
        await fs.access(p);
        existing.push(p);
      } catch {}
    }
    return existing;
  }

  private stripJsonComments(json: string): string {
    let insideString = false;
    let insideComment = false; // // style
    let insideBlockComment = false; // /* style
    let result = '';
    let i = 0;

    while (i < json.length) {
      const char = json[i];
      const nextChar = json[i + 1];

      if (insideString) {
        result += char;
        // Handle escaped quotes properly-ish (checking preceding backslash count is better but this is usually enough)
        if (char === '"' && json[i - 1] !== '\\') {
          insideString = false;
        }
      } else if (insideComment) {
        if (char === '\n') {
          insideComment = false;
          result += char;
        }
      } else if (insideBlockComment) {
        if (char === '*' && nextChar === '/') {
          insideBlockComment = false;
          i++; // Skip /
        }
      } else {
        // Not inside string or comment
        if (char === '"') {
          insideString = true;
          result += char;
        } else if (char === '/' && nextChar === '/') {
          insideComment = true;
          i++; // Skip second /
        } else if (char === '/' && nextChar === '*') {
          insideBlockComment = true;
          i++; // Skip *
        } else {
          result += char;
        }
      }
      i++;
    }
    return result;
  }

  private async readConfig(): Promise<OpencodeConfig> {
    this.providerSourceMap.clear();
    const mergedConfig: OpencodeConfig = { provider: {} };
    
    const paths = await this.getConfigPaths();
    
    // Read in reverse priority order so higher priority (earlier in list) overrides lower
    const pathsToRead = [...paths].reverse();
    
    if (pathsToRead.length === 0) {
      return { provider: {} };
    }

    for (const p of pathsToRead) {
      try {
        const content = await fs.readFile(p, 'utf-8');
        const json = this.stripJsonComments(content);
        const config = JSON.parse(json);
        
        if (config.provider) {
          for (const [id, provider] of Object.entries(config.provider)) {
            mergedConfig.provider[id] = provider as OpencodeProvider;
            this.providerSourceMap.set(id, p);
          }
        }
      } catch (e) {
        console.warn(`Failed to read config ${p}`, e);
      }
    }
    
    return mergedConfig;
  }

  private async writeConfig(config: OpencodeConfig, targetPath?: string): Promise<void> {
    try {
      const paths = await this.getConfigPaths();
      // Default to first existing path, or first candidate if none exist
      const p = targetPath || (paths.length > 0 ? paths[0] : this.getCandidates()[0]);
      
      // Ensure directory exists
      const dir = path.dirname(p);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(p, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing Kilocode config:', error);
      throw new Error('Failed to write Kilocode configuration');
    }
  }

  async getRawConfig(): Promise<string> {
    try {
      const paths = await this.getConfigPaths();
      const p = paths.length > 0 ? paths[0] : this.getCandidates()[0];
      return await fs.readFile(p, 'utf-8');
    } catch (error) {
      return '{}';
    }
  }

  async saveRawConfig(content: string): Promise<void> {
    try {
      // Validate JSON before saving
      const json = this.stripJsonComments(content);
      JSON.parse(json);
      
      const paths = await this.getConfigPaths();
      const p = paths.length > 0 ? paths[0] : this.getCandidates()[0];
      
      // Ensure directory exists
      const dir = path.dirname(p);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(p, content, 'utf-8');
    } catch (error) {
      throw new Error('Invalid JSON content');
    }
  }

  async listProviders(): Promise<Provider[]> {
    try {
      const config = await this.readConfig();
      
      if (!config.provider) {
        return [];
      }

      return Object.entries(config.provider).map(([id, p]) => ({
        id,
        name: p.name || id,
        type: 'custom',
        isActive: false, // Active state is managed by cc-switch, not this config
        config: {
          ...p,
          app: 'kilocode-cli'
        }
      }));
    } catch (error) {
      console.error('Error listing Kilocode providers:', error);
      return [];
    }
  }

  async getProviderById(id: string): Promise<Provider | null> {
    const config = await this.readConfig();
    const provider = config.provider?.[id];
    
    if (!provider) return null;

    return {
      id,
      name: provider.name || id,
      type: 'custom',
      isActive: false,
      config: {
        ...provider,
        app: 'kilocode-cli'
      }
    };
  }

  async switchProvider(id: string): Promise<void> {
    // Kilocode config doesn't seem to have a "current provider" field in the root
    // It might be managed externally or via disabled_providers
    // For now, we'll just verify it exists
    const config = await this.readConfig();
    if (!config.provider?.[id]) {
      throw new Error(`Provider '${id}' not found in Kilocode configuration`);
    }
  }

  async addProvider(params: {
    id: string;
    name: string;
    apiUrl: string;
    apiKey?: string;
    model?: string;
    models?: Record<string, OpencodeModel>;
    providerType?: string;
    usePromptCache?: boolean;
    [key: string]: any;
  }): Promise<void> {
    const config = await this.readConfig();
    
    if (!config.provider) {
      config.provider = {};
    }

    if (config.provider[params.id]) {
      throw new Error(`Provider '${params.id}' already exists`);
    }

    // Construct new provider object based on Opencode structure
    const newProvider: OpencodeProvider = {
      name: params.name,
      npm: params.providerType === 'litellm' ? '@ai-sdk/openai-compatible' : '@ai-sdk/openai-compatible', // Defaulting for now
      api: params.apiUrl,
      options: {
        baseURL: params.apiUrl,
        // Add apiKey if provided, though example didn't show it
        ...(params.apiKey ? { apiKey: params.apiKey } : {})
      },
      models: params.models || {}
    };

    // Add a default model if provided and no models map passed
    if (params.model && (!params.models || Object.keys(params.models).length === 0)) {
      newProvider.models = {
        [params.model]: {
          name: params.model,
          // Add LiteLLM specific fields if applicable
          ...(params.usePromptCache ? { usePromptCache: true } : {})
        }
      };
    }
    
    // Read specific file to modify (don't use merged config)
    const paths = await this.getConfigPaths();
    const targetPath = paths.length > 0 ? paths[0] : this.getCandidates()[0];
    
    let targetConfig: OpencodeConfig = { provider: {} };
    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      const json = this.stripJsonComments(content);
      targetConfig = JSON.parse(json);
    } catch {} // New file or invalid
    
    if (!targetConfig.provider) targetConfig.provider = {};
    
    targetConfig.provider[params.id] = newProvider;
    await this.writeConfig(targetConfig, targetPath);
  }

  async editProvider(id: string, params: {
    name?: string;
    apiUrl?: string;
    apiKey?: string;
    model?: string;
    models?: Record<string, OpencodeModel>;
    providerType?: string;
    usePromptCache?: boolean;
    [key: string]: any;
  }): Promise<void> {
    // Ensure source map is populated
    await this.readConfig();
    
    const sourcePath = this.providerSourceMap.get(id);
    if (!sourcePath) {
      throw new Error(`Provider '${id}' not found`);
    }

    // Read specific file
    const content = await fs.readFile(sourcePath, 'utf-8');
    const json = this.stripJsonComments(content);
    const config = JSON.parse(json);
    
    if (!config.provider || !config.provider[id]) {
      throw new Error(`Provider '${id}' not found in source file`);
    }

    const provider = config.provider[id];
    
    if (params.name) provider.name = params.name;
    
    // Update options
    if (!provider.options) provider.options = {};
    if (params.apiUrl) {
      provider.options.baseURL = params.apiUrl;
      provider.api = params.apiUrl;
    }
    if (params.apiKey) provider.options.apiKey = params.apiKey;

    // Update models if provided (full replacement/update)
    if (params.models) {
      provider.models = params.models;
    } else if (params.model) {
      // Fallback to single model update if models object not provided
      if (!provider.models) provider.models = {};
      
      // If the model exists, update it. If not, create it.
      if (!provider.models[params.model]) {
        provider.models[params.model] = { name: params.model };
      }
      
      if (params.usePromptCache !== undefined) {
        provider.models[params.model].usePromptCache = params.usePromptCache;
      }
    }

    config.provider[id] = provider;
    await this.writeConfig(config, sourcePath);
  }

  async deleteProvider(id: string): Promise<void> {
    await this.readConfig();
    const sourcePath = this.providerSourceMap.get(id);
    
    if (!sourcePath) return;

    const content = await fs.readFile(sourcePath, 'utf-8');
    const json = this.stripJsonComments(content);
    const config = JSON.parse(json);
    
    if (config.provider && config.provider[id]) {
      delete config.provider[id];
      await this.writeConfig(config, sourcePath);
    }
  }
}

export const kilocodeService = new KilocodeService();
