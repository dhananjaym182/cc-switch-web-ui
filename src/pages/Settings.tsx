import { useEffect, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { settingsApi } from '../services/api';
import type { AppSettings } from '../types';

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    autoSwitch: false,
    notifications: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await settingsApi.get();
      setSettings(response.settings || { theme: 'dark', autoSwitch: false, notifications: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await settingsApi.update(settings);
      setSuccess('Settings saved successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage your application preferences
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-emerald-600 dark:text-emerald-400">{success}</p>
        </div>
      )}

      {/* Behavior Settings */}
      <Card>
        <CardHeader
          title="Behavior"
          subtitle="Configure application behavior"
        />
        <div className="space-y-4">
          {/* Auto Switch */}
          <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Auto Switch
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Automatically switch to the last used provider on startup
                </p>
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoSwitch: !settings.autoSwitch })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoSwitch ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoSwitch ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Notifications
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Show notifications for important events
                </p>
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card>
        <CardHeader title="About" />
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Version</span>
            <span className="font-medium text-slate-900 dark:text-white">0.1.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Frontend</span>
            <span className="font-medium text-slate-900 dark:text-white">React 18 + Vite</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500 dark:text-slate-400">Backend</span>
            <span className="font-medium text-slate-900 dark:text-white">Express + TypeScript</span>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving} size="lg">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
