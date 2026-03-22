import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const VersionHistoryModal: React.FC = () => {
  const { 
    isVersionHistoryModalOpen, 
    setIsVersionHistoryModalOpen,
    versionHistory,
    historyError,
    fetchVersionHistory,
    restoreVersion,
    isLoading,
    currentGraphId
  } = useStore();

  useEffect(() => {
    if (isVersionHistoryModalOpen && currentGraphId) {
      fetchVersionHistory();
    }
  }, [isVersionHistoryModalOpen, currentGraphId, fetchVersionHistory]);

  useEffect(() => {
    if (isVersionHistoryModalOpen && versionHistory.length === 0) {
      fetchVersionHistory();
    }
  }, [isVersionHistoryModalOpen, versionHistory.length, fetchVersionHistory]);

  if (!isVersionHistoryModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <History size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Version History</h2>
                <p className="text-sm text-gray-500">Restore previous versions of this graph</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchVersionHistory()}
                disabled={isLoading}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-indigo-600 disabled:opacity-50"
                title="Refresh History"
              >
                <RotateCcw size={18} className={cn(isLoading && "animate-spin")} />
              </button>
              <button
                onClick={() => setIsVersionHistoryModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {historyError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 bg-red-100 text-red-600 rounded-full mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load history</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-[250px]">{historyError}</p>
                <button
                  onClick={() => fetchVersionHistory()}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <RotateCcw size={16} />
                  Try Again
                </button>
              </div>
            ) : isLoading && versionHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="animate-spin mb-4">
                  <History size={32} />
                </div>
                <p>Loading history...</p>
              </div>
            ) : versionHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No version history found for this graph.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versionHistory.map((item) => (
                  <div
                    key={item.version}
                    className="group p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-mono text-sm group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        v{item.version}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                          <Clock size={14} className="text-gray-400" />
                          {isNaN(new Date(item.timestamp).getTime()) ? 'Unknown Date' : new Date(item.timestamp).toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {isNaN(new Date(item.timestamp).getTime()) ? 'Unknown' : `${new Date(item.timestamp).toLocaleDateString()} at ${new Date(item.timestamp).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to restore version ${item.version}? Current changes will be overwritten.`)) {
                          restoreVersion(item.version);
                        }
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <RotateCcw size={14} />
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Restoring a version will create a new version with that data.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
