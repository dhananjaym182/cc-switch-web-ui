import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit, Wrench, Play, Copy, Check } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { customToolsApi } from '../services/api';
import type { CustomTool, RegisterToolRequest, RunToolResult } from '../types';

export function CustomTools() {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [formData, setFormData] = useState<RegisterToolRequest>({
    name: '',
    description: '',
    command: '',
    args: [],
    env: {},
  });

  // Run tool states
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runningTool, setRunningTool] = useState<CustomTool | null>(null);
  const [runArgs, setRunArgs] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunToolResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'stdout' | 'stderr' | null>(null);

  const fetchTools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await customToolsApi.list();
      setTools(response.tools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingTool) {
        // Delete and re-register (simplified approach)
        await customToolsApi.delete(editingTool.id);
      }
      await customToolsApi.register(formData);
      setIsModalOpen(false);
      setEditingTool(null);
      setFormData({ name: '', description: '', command: '', args: [], env: {} });
      fetchTools();
      setSuccess(editingTool ? 'Tool updated successfully' : 'Tool added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tool');
    }
  };

  const handleDelete = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    setError(null);
    try {
      await customToolsApi.delete(toolId);
      fetchTools();
      setSuccess('Tool deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tool');
    }
  };

  const openEditModal = (tool: CustomTool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description || '',
      command: tool.command,
      args: tool.args || [],
      env: tool.env || {},
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingTool(null);
    setFormData({ name: '', description: '', command: '', args: [], env: {} });
    setIsModalOpen(true);
  };

  const openRunModal = (tool: CustomTool) => {
    setRunningTool(tool);
    setRunArgs(tool.args?.join(' ') || '');
    setRunResult(null);
    setRunError(null);
    setIsRunModalOpen(true);
  };

  const handleRun = async () => {
    if (!runningTool) return;
    setIsRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const args = runArgs.trim() ? runArgs.split(' ').filter(Boolean) : undefined;
      const result = await customToolsApi.run(runningTool.id, args);
      setRunResult(result);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to run tool');
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'stdout' | 'stderr') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Custom Tools
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your custom CLI tools
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tool
        </Button>
      </div>

      {/* Success message */}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tools table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Command
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {tools.map((tool) => (
                <tr key={tool.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900 dark:text-white">
                        {tool.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                      {tool.command}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {tool.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                    {new Date(tool.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRunModal(tool)}
                        title="Run tool"
                      >
                        <Play className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(tool)}
                        title="Edit tool"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(tool.id)}
                        title="Delete tool"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {tools.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              No custom tools registered yet.
            </p>
            <Button className="mt-4" onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Tool
            </Button>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTool ? 'Edit Tool' : 'Add Custom Tool'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Command *
            </label>
            <input
              type="text"
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              placeholder="/usr/local/bin/my-tool"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Arguments (comma-separated)
            </label>
            <input
              type="text"
              value={formData.args?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  args: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="--flag, value"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTool ? 'Update' : 'Add'} Tool
            </Button>
          </div>
        </form>
      </Modal>

      {/* Run Tool Modal */}
      <Modal
        isOpen={isRunModalOpen}
        onClose={() => {
          setIsRunModalOpen(false);
          setRunningTool(null);
          setRunResult(null);
          setRunError(null);
        }}
        title={`Run Tool: ${runningTool?.name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Tool info */}
          {runningTool && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                Command
              </p>
              <code className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">
                {runningTool.command} {runningTool.args?.join(' ')}
              </code>
              {runningTool.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  {runningTool.description}
                </p>
              )}
            </div>
          )}

          {/* Arguments input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Additional Arguments
            </label>
            <input
              type="text"
              value={runArgs}
              onChange={(e) => setRunArgs(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              placeholder="Space-separated arguments to pass to the tool"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              These arguments will be passed to the command in addition to any predefined arguments.
            </p>
          </div>

          {/* Run button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRunModalOpen(false);
                setRunningTool(null);
                setRunResult(null);
                setRunError(null);
              }}
            >
              Close
            </Button>
            <Button
              onClick={handleRun}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Tool
                </>
              )}
            </Button>
          </div>

          {/* Error display */}
          {runError && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 font-medium">Error</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{runError}</p>
            </div>
          )}

          {/* Result display */}
          {runResult && (
            <div className="space-y-3">
              {/* Exit code indicator */}
              <div className={`p-3 rounded-lg ${
                runResult.exitCode === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}>
                <p className={`font-medium ${
                  runResult.exitCode === 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  Exit Code: {runResult.exitCode}
                </p>
              </div>

              {/* Stdout */}
              {runResult.stdout && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                      Standard Output
                    </p>
                    <button
                      onClick={() => copyToClipboard(runResult.stdout, 'stdout')}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                      title="Copy to clipboard"
                    >
                      {copied === 'stdout' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <pre className="text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                    {runResult.stdout}
                  </pre>
                </div>
              )}

              {/* Stderr */}
              {runResult.stderr && (
                <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-red-500 dark:text-red-400 uppercase font-semibold">
                      Standard Error
                    </p>
                    <button
                      onClick={() => copyToClipboard(runResult.stderr, 'stderr')}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                      title="Copy to clipboard"
                    >
                      {copied === 'stderr' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <pre className="text-sm font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                    {runResult.stderr}
                  </pre>
                </div>
              )}

              {/* No output message */}
              {!runResult.stdout && !runResult.stderr && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Tool executed successfully with no output.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
