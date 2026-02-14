import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2, Database, Edit, Power, PowerOff } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { mcpApi } from '../services/api';
import { useApp } from '../contexts/AppContext';
import type { McpServer, AddMcpServerRequest, EditMcpServerRequest } from '../types';

export function McpServers() {
  const { selectedApp } = useApp();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    args: '',
    env: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await mcpApi.list(selectedApp);
      setServers(response.servers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MCP servers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [selectedApp]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await mcpApi.sync(selectedApp);
      await fetchServers();
      setSuccess('MCP servers synced successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync MCP servers');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdd = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const requestData: AddMcpServerRequest = {
        name: formData.name,
        command: formData.command,
        args: formData.args ? formData.args.split(' ').filter(Boolean) : undefined,
        env: formData.env ? JSON.parse(formData.env) : undefined,
        app: selectedApp,
      };
      await mcpApi.add(requestData);
      setIsAddModalOpen(false);
      setFormData({ name: '', command: '', args: '', env: '' });
      await fetchServers();
      setSuccess('MCP server added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add MCP server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedServer) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const requestData: EditMcpServerRequest = {
        id: selectedServer.id,
        name: formData.name,
        command: formData.command,
        args: formData.args ? formData.args.split(' ').filter(Boolean) : undefined,
        env: formData.env ? JSON.parse(formData.env) : undefined,
      };
      await mcpApi.edit(requestData);
      setIsEditModalOpen(false);
      setSelectedServer(null);
      setFormData({ name: '', command: '', args: '', env: '' });
      await fetchServers();
      setSuccess('MCP server updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit MCP server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedServer) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await mcpApi.delete(selectedServer.id, selectedApp);
      setIsDeleteModalOpen(false);
      setSelectedServer(null);
      await fetchServers();
      setSuccess('MCP server deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete MCP server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (server: McpServer) => {
    setError(null);
    try {
      await mcpApi.toggle({
        id: server.id,
        enabled: !server.enabled,
        app: selectedApp
      });
      await fetchServers();
      setSuccess(`MCP server ${server.enabled ? 'disabled' : 'enabled'} successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle MCP server');
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', command: '', args: '', env: '' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (server: McpServer) => {
    setSelectedServer(server);
    setFormData({
      name: server.name,
      command: server.command,
      args: server.args?.join(' ') || '',
      env: server.env ? JSON.stringify(server.env, null, 2) : ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (server: McpServer) => {
    setSelectedServer(server);
    setIsDeleteModalOpen(true);
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
            MCP Servers
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage Model Context Protocol servers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </Button>
        </div>
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

      {/* Servers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((server) => (
          <Card key={server.id} className={`hover:border-primary-500 transition-colors ${server.enabled === false ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${server.enabled === false ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {server.name}
                    </h3>
                    {server.enabled === false && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded-full">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                    {server.id}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                  Command
                </p>
                <code className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">
                  {server.command} {server.args?.join(' ')}
                </code>
              </div>
              
              {server.env && Object.keys(server.env).length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                    Environment Variables
                  </p>
                  <div className="space-y-1">
                    {Object.entries(server.env).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="font-mono text-slate-600 dark:text-slate-400">{key}:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={value}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleToggle(server)}
                className={`p-2 rounded-lg transition-colors ${
                  server.enabled === false
                    ? 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                    : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                }`}
                title={server.enabled === false ? 'Enable Server' : 'Disable Server'}
              >
                {server.enabled === false ? (
                  <PowerOff className="w-4 h-4" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => openEditModal(server)}
                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit Server"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => openDeleteModal(server)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete Server"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {servers.length === 0 && (
        <Card className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Database className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No MCP Servers Found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              You haven't added any Model Context Protocol servers yet. Add servers to extend the capabilities of your AI assistant.
            </p>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Server
            </Button>
          </div>
        </Card>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add MCP Server"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g. my-mcp-server"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Command <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g. npx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Arguments
            </label>
            <input
              type="text"
              value={formData.args}
              onChange={(e) => setFormData({ ...formData, args: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Space-separated arguments, e.g. -y @modelcontextprotocol/server-filesystem"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Separate multiple arguments with spaces
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Environment Variables
            </label>
            <textarea
              value={formData.env}
              onChange={(e) => setFormData({ ...formData, env: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent h-24 font-mono text-sm"
              placeholder='{"API_KEY": "your-key", "DEBUG": "true"}'
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              JSON object with key-value pairs
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdd} 
              disabled={!formData.name || !formData.command || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Server'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit MCP Server"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Command
            </label>
            <input
              type="text"
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Arguments
            </label>
            <input
              type="text"
              value={formData.args}
              onChange={(e) => setFormData({ ...formData, args: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Space-separated arguments"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Separate multiple arguments with spaces
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Environment Variables
            </label>
            <textarea
              value={formData.env}
              onChange={(e) => setFormData({ ...formData, env: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent h-24 font-mono text-sm"
              placeholder='{"API_KEY": "your-key"}'
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              JSON object with key-value pairs
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete MCP Server"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to delete the MCP server <strong>{selectedServer?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Server'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
