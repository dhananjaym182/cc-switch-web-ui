import { Provider, SpeedtestResult } from '../types';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { Trash2, Edit, Copy, Gauge } from 'lucide-react';

interface ProviderCardProps {
  provider: Provider;
  isActive: boolean;
  onSwitch: (providerId: string) => void;
  isSwitching?: boolean;
  onDelete?: (providerId: string) => void;
  onEdit?: (provider: Provider) => void;
  onDuplicate?: (provider: Provider) => void;
  onSpeedtest?: (providerId: string) => void;
  isSpeedtesting?: boolean;
  speedtestResult?: SpeedtestResult | null;
}

const providerIcons: Record<string, string> = {
  claude: '🤖',
  gemini: '✨',
  codex: '💻',
  custom: '⚙️',
};

const providerColors: Record<string, string> = {
  claude: 'border-orange-500',
  gemini: 'border-blue-500',
  codex: 'border-green-500',
  custom: 'border-purple-500',
};

export function ProviderCard({
  provider,
  isActive,
  onSwitch,
  isSwitching = false,
  onDelete,
  onEdit,
  onDuplicate,
  onSpeedtest,
  isSpeedtesting = false,
  speedtestResult,
}: ProviderCardProps) {
  return (
    <div
      className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${
        isActive
          ? `${providerColors[provider.type]} ring-2 ring-primary-500/20`
          : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600'
      }`}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2">
          <StatusBadge status="active" label="Active" pulse />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{providerIcons[provider.type] || '📦'}</span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {provider.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
              {provider.type}
            </p>
          </div>
        </div>

        {/* Speedtest Result Display */}
        {speedtestResult && (
          <div className={`mb-3 p-2 rounded-lg text-sm ${
            speedtestResult.success
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {speedtestResult.success ? (
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                <span>Latency: {speedtestResult.latency}ms</span>
              </div>
            ) : (
              <span>Error: {speedtestResult.error || speedtestResult.message}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <StatusBadge
            status={isActive ? 'success' : 'inactive'}
            label={isActive ? 'Current' : 'Available'}
          />

          <div className="flex gap-1">
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(provider)}
                className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                title="Duplicate Provider"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            {onSpeedtest && (
              <button
                onClick={() => onSpeedtest(provider.id)}
                disabled={isSpeedtesting}
                className={`p-2 rounded-lg transition-colors ${
                  isSpeedtesting
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
                }`}
                title="Run Speed Test"
              >
                {isSpeedtesting ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin" />
                ) : (
                  <Gauge className="w-4 h-4" />
                )}
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(provider)}
                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit Provider"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {!isActive && onDelete && (
              <button
                onClick={() => onDelete(provider.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete Provider"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {!isActive && (
              <Button
                size="sm"
                onClick={() => onSwitch(provider.id)}
                isLoading={isSwitching}
              >
                Switch
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
