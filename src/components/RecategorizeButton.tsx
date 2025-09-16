import React, { useState, useEffect } from 'react';
import { RefreshCw, Brain, AlertCircle, CheckCircle, Sparkles, Zap, TrendingUp, Clock } from 'lucide-react';
import { useRecategorization, RecategorizeMode } from '../hooks/useRecategorization';
import { useAICategorize } from '../contexts/AICategorizeContext';
import { supabase } from '../lib/supabase';

interface RecategorizeButtonProps {
  workspaceId: string;
  onComplete?: () => void;
}

export const RecategorizeButton: React.FC<RecategorizeButtonProps> = ({ 
  workspaceId, 
  onComplete 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'uncategorized' | 'recategorize' | 'all'>('uncategorized');
  const [batchSize, setBatchSize] = useState(10);
  const [force, setForce] = useState(false);
  const [uncategorizedCount, setUncategorizedCount] = useState<number>(0);
  
  const {
    recategorizeTransactions,
    isProcessing: oldProcessing,
    progress: oldProgress,
    lastResult,
    clearProgress: oldClearProgress
  } = useRecategorization();
  
  const {
    startCategorization,
    isProcessing,
    total,
    processed,
    clearProgress
  } = useAICategorize();

  // Fetch uncategorized transactions count
  useEffect(() => {
    const fetchUncategorizedCount = async () => {
      if (!workspaceId) return;
      
      const { count } = await supabase
        .from('feed_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('direction', 'outflow')
        .is('ai_category_primary', null)
        .is('user_category_primary', null);
      
      setUncategorizedCount(count || 0);
    };

    fetchUncategorizedCount();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel(`uncategorized-count-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_transactions',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          fetchUncategorizedCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [workspaceId]);

  const handleRecategorize = async () => {
    try {
      // Start categorization using the new context
      await startCategorization(selectedMode);
      
      // Close modal after starting
      setShowModal(false);
      
      // The progress indicator will handle the rest
      onComplete?.();
    } catch (error) {
      console.error('Recategorization failed:', error);
    }
  };

  const modeOptions = [
    {
      value: 'uncategorized' as 'uncategorized' | 'recategorize' | 'all',
      label: 'Fill Gaps',
      description: 'Categorize uncategorized only',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      value: 'recategorize' as 'uncategorized' | 'recategorize' | 'all',
      label: 'Smart Update',
      description: 'Re-analyze AI categories',
      icon: <Brain className="w-5 h-5" />,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      value: 'all' as 'uncategorized' | 'recategorize' | 'all',
      label: 'Full Refresh',
      description: 'Recategorize everything',
      icon: <Zap className="w-5 h-5" />,
      color: 'from-orange-500 to-red-600'
    }
  ];

  const batchOptions = [
    { value: 5, label: 'Quick', description: '5 at a time' },
    { value: 10, label: 'Balanced', description: '10 at a time' },
    { value: 25, label: 'Fast', description: '25 at a time' },
    { value: 50, label: 'Turbo', description: '50 at a time' }
  ];

  return (
    <>
      <div className="relative inline-block">
        {/* Count Badge */}
        {uncategorizedCount > 0 && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow-lg animate-pulse">
              {uncategorizedCount > 999 ? '999+' : uncategorizedCount}
            </div>
          </div>
        )}
        
        {/* Main Button */}
        <button
          onClick={() => setShowModal(true)}
          className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          title={`Categorize ${uncategorizedCount} transactions using AI`}
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity" />
          <Brain className="w-4 h-4" />
          <span className="font-medium">AI Categorize</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <div className="absolute inset-0 bg-black opacity-10" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">AI Categorization</h2>
                </div>
                <p className="text-white/90 text-sm">
                  Intelligently categorize your transactions using AI and learned patterns
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {!isProcessing && !lastResult && (
                <>
                  {/* Mode Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-300 mb-3">
                      Processing Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {modeOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedMode(option.value)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                            selectedMode === option.value
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 ${
                            selectedMode === option.value ? 'opacity-5' : ''
                          } rounded-xl transition-opacity`} />
                          <div className="relative">
                            <div className={`mb-2 ${
                              selectedMode === option.value ? 'text-purple-400' : 'text-gray-400'
                            }`}>
                              {option.icon}
                            </div>
                            <div className="text-sm font-semibold text-white mb-1">
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-400">
                              {option.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Batch Size */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-300 mb-3">
                      Processing Speed
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {batchOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setBatchSize(option.value)}
                          className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                            batchSize === option.value
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                          }`}
                        >
                          <div className="text-sm font-semibold text-white mb-1">
                            {option.label}
                          </div>
                          <div className="text-xs text-gray-400">
                            {option.description}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Smaller batches are more responsive but take longer overall
                    </p>
                  </div>

                  {/* Force Option */}
                  {selectedMode === 'all' && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={force}
                          onChange={(e) => setForce(e.target.checked)}
                          className="mt-1 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-yellow-400 mb-1">
                            Override Manual Edits
                          </div>
                          <div className="text-xs text-gray-400">
                            This will replace your manual category selections with AI suggestions
                          </div>
                          {force && (
                            <div className="mt-2 flex items-start gap-1 text-xs text-yellow-500">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>Your manual corrections will be overwritten!</span>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Info Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-300">Smart Learning</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Uses patterns from your 17 corrections to improve accuracy
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-xl border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold text-blue-300">Batch Processing</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Efficiently processes transactions without freezing the UI
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Processing State - Now handled by global indicator */}

              {/* Results */}
              {lastResult && (
                <div className="py-8">
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Categorization Complete!</h3>
                    <p className="text-sm text-gray-400">Successfully processed your transactions</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-white mb-1">
                        {lastResult.recategorized}
                      </div>
                      <div className="text-xs text-gray-400">Recategorized</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {lastResult.learned_patterns_used}
                      </div>
                      <div className="text-xs text-gray-400">Used Learned Patterns</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Total Processed</span>
                      <span className="text-white font-medium">{lastResult.processed}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">AI Categorized</span>
                      <span className="text-blue-400 font-medium">{lastResult.ai_categorized}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Skipped</span>
                      <span className="text-gray-500 font-medium">{lastResult.skipped}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-800 p-6">
              {!isProcessing && !lastResult && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecategorize}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Start Categorization
                  </button>
                </div>
              )}
              
              {lastResult && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    clearProgress();
                  }}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};