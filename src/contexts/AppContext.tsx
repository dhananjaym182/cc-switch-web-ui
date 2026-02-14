import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Core apps supported by cc-switch CLI
export type CoreAppType = 'claude' | 'codex' | 'gemini';

// Custom apps that can be configured
export type CustomAppType = 'kilocode-cli' | 'opencode' | 'amp';

// Combined app type
export type AppType = CoreAppType | CustomAppType;

// List of valid app values for validation
export const VALID_APPS: AppType[] = [
  'claude', 'codex', 'gemini',
  'kilocode-cli', 'opencode', 'amp'
];

// Check if an app is a core app
export function isCoreApp(app: AppType): app is CoreAppType {
  return ['claude', 'codex', 'gemini'].includes(app);
}

// Check if an app is a custom app
export function isCustomApp(app: AppType): app is CustomAppType {
  return ['kilocode-cli', 'opencode', 'amp'].includes(app);
}

interface AppContextType {
  selectedApp: AppType;
  setSelectedApp: (app: AppType) => void;
}

const APP_STORAGE_KEY = 'cc-switch-selected-app';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedApp, setSelectedAppState] = useState<AppType>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(APP_STORAGE_KEY);
      if (stored && VALID_APPS.includes(stored as AppType)) {
        return stored as AppType;
      }
    }
    return 'claude'; // Default to claude
  });

  const setSelectedApp = useCallback((app: AppType) => {
    setSelectedAppState(app);
    localStorage.setItem(APP_STORAGE_KEY, app);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === APP_STORAGE_KEY && e.newValue) {
        const newApp = e.newValue as AppType;
        if (VALID_APPS.includes(newApp)) {
          setSelectedAppState(newApp);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AppContext.Provider value={{ selectedApp, setSelectedApp }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// App options for the dropdown selector
export const APP_OPTIONS: { value: AppType; label: string; icon: string; category: 'core' | 'custom' }[] = [
  // Core apps
  { value: 'claude', label: 'Claude', icon: '🤖', category: 'core' },
  { value: 'codex', label: 'Codex', icon: '💻', category: 'core' },
  { value: 'gemini', label: 'Gemini', icon: '✨', category: 'core' },
  // Custom apps
  { value: 'kilocode-cli', label: 'Kilocode CLI', icon: '🔧', category: 'custom' },
  { value: 'opencode', label: 'OpenCode', icon: '🔓', category: 'custom' },
  { value: 'amp', label: 'AMP', icon: '⚡', category: 'custom' },
];
