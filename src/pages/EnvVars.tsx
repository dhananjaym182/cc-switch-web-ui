import { useEffect, useState } from 'react';
import { RefreshCw, Terminal, Eye, EyeOff } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { envApi } from '../services/api';
import type { EnvVar } from '../types';

export function EnvVars() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleValues, setVisibleValues] = useState<Record<string, boolean>>({});

  const fetchEnvVars = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await envApi.list();
      setEnvVars(response.envVars || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch environment variables');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvVars();
  }, []);

  const toggleVisibility = (index: number) => {
    setVisibleValues(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Environment Variables
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View environment variables and their sources
          </p>
        </div>
        <Button variant="secondary" onClick={fetchEnvVars}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Env Vars Table */}
      <Card className="overflow-hidden" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Variable</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Value</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Source Type</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {envVars.map((env, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                    {env.variable}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded max-w-[200px] truncate">
                        {visibleValues[index] ? env.value : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => toggleVisibility(index)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {visibleValues[index] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      env.sourceType === 'system'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {env.sourceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs truncate max-w-[200px]" title={env.sourceLocation}>
                    {env.sourceLocation}
                  </td>
                </tr>
              ))}
              {envVars.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                        <Terminal className="w-6 h-6 text-slate-400" />
                      </div>
                      <p>No environment variables found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
