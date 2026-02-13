import React, { useEffect, useState } from 'react';
import { Save, FolderOpen, Trash2, Download, Clock } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { profilesApi } from '../services/api';
import type { Profile, SaveProfileRequest } from '../types';

export function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SaveProfileRequest>({
    name: '',
    description: '',
  });

  const fetchProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await profilesApi.list();
      setProfiles(response.profiles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await profilesApi.save(formData);
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  };

  const handleLoad = async (profileId: string) => {
    setLoadingId(profileId);
    setError(null);
    try {
      const response = await profilesApi.load(profileId);
      if (response.success) {
        fetchProfiles();
      } else {
        setError(response.message || 'Failed to load profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    setError(null);
    try {
      await profilesApi.delete(profileId);
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
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
            Profiles
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Save and load API configurations
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Save className="w-4 h-4 mr-2" />
          Save Current Config
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Profiles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {profile.name}
                </h3>
              </div>
            </div>

            {profile.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                {profile.description}
              </p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Provider:</span>
                <StatusBadge status="active" label={profile.providerName} />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleLoad(profile.id)}
                isLoading={loadingId === profile.id}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                Load
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(profile.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {profiles.length === 0 && (
        <Card className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            No profiles saved yet. Save your current configuration for quick access.
          </p>
          <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
            <Save className="w-4 h-4 mr-2" />
            Save Your First Profile
          </Button>
        </Card>
      )}

      {/* Save Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Save Current Configuration"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Profile Name *
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
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
