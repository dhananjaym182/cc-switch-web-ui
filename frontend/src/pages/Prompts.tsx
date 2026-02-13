import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, MessageSquare, Clock, Plus, Trash2, Edit, XCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { promptsApi } from '../services/api';
import { useApp } from '../contexts/AppContext';
import type { Prompt } from '../types';

export function Prompts() {
  const { selectedApp } = useApp();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: ''
  });

  // Get the active prompt
  const activePrompt = prompts.find(p => p.isActive);

  const fetchPrompts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await promptsApi.list(selectedApp);
      setPrompts(response.prompts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [selectedApp]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleActivate = async (promptId: string) => {
    setActivatingId(promptId);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await promptsApi.activate(promptId, selectedApp);
      await fetchPrompts();
      setSuccessMessage(result.message || 'Prompt activated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate prompt');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await promptsApi.deactivate(selectedApp);
      await fetchPrompts();
      setSuccessMessage(result.message || 'Prompt deactivated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate prompt');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleCreate = async () => {
    try {
      await promptsApi.create({ ...formData, app: selectedApp });
      setIsCreateModalOpen(false);
      setFormData({ name: '', description: '', content: '' });
      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prompt');
    }
  };

  const handleEdit = async () => {
    if (!selectedPrompt) return;
    try {
      await promptsApi.edit({ ...formData, id: selectedPrompt.id, app: selectedApp });
      setIsEditModalOpen(false);
      setSelectedPrompt(null);
      setFormData({ name: '', description: '', content: '' });
      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit prompt');
    }
  };

  const handleDelete = async () => {
    if (!selectedPrompt) return;
    try {
      await promptsApi.delete(selectedPrompt.id, selectedApp);
      setIsDeleteModalOpen(false);
      setSelectedPrompt(null);
      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  const openEditModal = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      content: prompt.content || ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
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
            System Prompts
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage and activate different system prompts
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Prompt
          </Button>
          <Button variant="secondary" onClick={fetchPrompts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Active prompt indicator */}
      {activePrompt && (
        <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  Currently Active Prompt
                </p>
                <p className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                  {activePrompt.name}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
            >
              {isDeactivating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Deactivate
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Prompts list */}
      <div className="grid grid-cols-1 gap-4">
        {prompts.map((prompt) => (
          <Card
            key={prompt.id}
            className={`transition-all ${
              prompt.isActive
                ? 'border-primary-500 ring-1 ring-primary-500 shadow-md'
                : 'hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  prompt.isActive
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                      {prompt.name}
                    </h3>
                    {prompt.isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {prompt.description || 'No description provided'}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500 font-mono">
                    <span title="ID">ID: {prompt.id}</span>
                    {prompt.updated && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated: {prompt.updated}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!prompt.isActive && (
                  <Button
                    onClick={() => handleActivate(prompt.id)}
                    disabled={activatingId === prompt.id}
                  >
                    {activatingId === prompt.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      'Activate'
                    )}
                  </Button>
                )}
                {prompt.isActive && (
                  <Button variant="secondary" disabled className="opacity-50 cursor-not-allowed">
                    Active
                  </Button>
                )}
                
                <Button variant="secondary" onClick={() => openEditModal(prompt)} title="Edit">
                  <Edit className="w-4 h-4" />
                </Button>
                
                <Button variant="danger" onClick={() => openDeleteModal(prompt)} title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {prompts.length === 0 && (
        <Card className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No Prompts Found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              You haven't added any system prompts yet. Add prompts to customize the behavior of your AI assistant.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Prompt
            </Button>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Prompt"
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
              placeholder="e.g. Coding Assistant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Brief description of the prompt"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent h-48 font-mono text-sm"
              placeholder="Enter system prompt content..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.content}>
              Create Prompt
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Prompt"
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
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent h-48 font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Prompt"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to delete the prompt <strong>{selectedPrompt?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Prompt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
