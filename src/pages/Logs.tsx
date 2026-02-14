import { useEffect, useState } from 'react';
import { FileText, Trash2, RefreshCw, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { logsApi } from '../services/api';
import type { LogEntry } from '../types';

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await logsApi.list(100);
      setLogs(response.logs || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return;
    setError(null);
    try {
      await logsApi.clear();
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear logs');
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <StatusBadge status="error" label="Error" />;
      case 'warn':
        return <StatusBadge status="warning" label="Warning" />;
      default:
        return <StatusBadge status="active" label="Info" />;
    }
  };

  const filteredLogs = levelFilter === 'all' 
    ? logs 
    : logs.filter(log => log.level === levelFilter);

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
            Operation Logs
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View operation history and system events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="danger" onClick={handleClearLogs}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">Filter by:</span>
          <div className="flex gap-2">
            {['all', 'info', 'warn', 'error'].map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  levelFilter === level
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
            {total} total entries
          </span>
        </div>
      </Card>

      {/* Logs table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400 w-40">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400 w-24">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400 w-40">
                  Operation
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {getLevelBadge(log.level)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {log.operation}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              {levelFilter === 'all' 
                ? 'No logs recorded yet.' 
                : `No ${levelFilter} logs found.`}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
