import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Globe, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const languages = [
  { id: 'turkish', name: 'Turkish', code: 'tr' },
  { id: 'norwegian', name: 'Norwegian', code: 'no' },
  { id: 'english', name: 'English', code: 'en' },
];

export const TranslationModal: React.FC = () => {
  const { 
    isTranslationModalOpen, 
    setIsTranslationModalOpen, 
    translateGraph, 
    translationStatus, 
    translationProgress,
    error
  } = useStore();
  
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  if (!isTranslationModalOpen) return null;

  const handleTranslate = () => {
    if (selectedLang) {
      translateGraph(selectedLang);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Translate Graph</h2>
              <p className="text-sm text-gray-500">Global Approach B: Save as new graph</p>
            </div>
          </div>
          <button 
            onClick={() => setIsTranslationModalOpen(false)}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            disabled={translationStatus === 'translating'}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {translationStatus === 'idle' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Select Target Language</label>
                <div className="grid grid-cols-1 gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLang(lang.name)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        selectedLang === lang.name 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="font-medium">{lang.name}</span>
                      {selectedLang === lang.name && <Check size={20} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <p className="text-xs text-yellow-800 leading-relaxed">
                  <strong>Note:</strong> This will create a completely new graph with translated content. 
                  Special tags (FANCY, SECTION, etc.) and Sanskrit terms will be preserved.
                </p>
              </div>

              <button
                onClick={handleTranslate}
                disabled={!selectedLang}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Start Translation
              </button>
            </>
          )}

          {translationStatus === 'translating' && (
            <div className="py-8 text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <motion.div 
                  className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                ></motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">{translationProgress}%</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Translating Graph...</h3>
                <p className="text-sm text-gray-500 mt-1">Please wait while we process your nodes.</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <motion.div 
                  className="bg-blue-600 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${translationProgress}%` }}
                ></motion.div>
              </div>
            </div>
          )}

          {translationStatus === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Translation Complete!</h3>
                <p className="text-sm text-gray-500 mt-1">A new translated graph has been created and loaded.</p>
              </div>
            </div>
          )}

          {translationStatus === 'error' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Translation Failed</h3>
                <p className="text-sm text-red-500 mt-1">{error || 'An unexpected error occurred.'}</p>
              </div>
              <button
                onClick={() => setIsTranslationModalOpen(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
