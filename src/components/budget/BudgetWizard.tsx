import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, DollarSign, TrendingUp, ChevronRight, ChevronLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget';
import { useTheme } from '../../contexts/ThemeContext';

interface BudgetWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const BudgetWizard: React.FC<BudgetWizardProps> = ({ onComplete, onCancel }) => {
  const { isDark } = useTheme();
  const { analyzeWithAI, createBudget } = useBudget();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    period_type: 'monthly' as 'monthly' | 'quarterly' | 'annually',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    strategy: 'envelope' as 'envelope' | '50_30_20' | 'zero_based',
    analysisMonths: 3
  });
  
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  // Calculate end date based on period type
  React.useEffect(() => {
    const start = new Date(formData.start_date);
    let end: Date;
    
    switch (formData.period_type) {
      case 'monthly':
        end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate() - 1);
        break;
      case 'quarterly':
        end = new Date(start.getFullYear(), start.getMonth() + 3, start.getDate() - 1);
        break;
      case 'annually':
        end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate() - 1);
        break;
    }
    
    setFormData(prev => ({ ...prev, end_date: end.toISOString().split('T')[0] }));
  }, [formData.start_date, formData.period_type]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await analyzeWithAI(formData.analysisMonths, formData.strategy);
      if (result) {
        setAiSuggestions(result);
        setStep(3);
      }
    } catch (err) {
      setError('Failed to analyze spending patterns. Please try again.');
      console.error('AI analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await createBudget({
        ...formData,
        use_ai_suggestions: !!aiSuggestions
      });
      onComplete();
    } catch (err) {
      setError('Failed to create budget. Please try again.');
      console.error('Budget creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <label className="block text-sm font-medium mb-2">Budget Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-4 py-2 rounded-lg border ${
            isDark 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          placeholder="e.g., January 2024 Budget"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Period Type</label>
        <select
          value={formData.period_type}
          onChange={(e) => setFormData({ ...formData, period_type: e.target.value as any })}
          className={`w-full px-4 py-2 rounded-lg border ${
            isDark 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annually">Annually</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Start Date</label>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          className={`w-full px-4 py-2 rounded-lg border ${
            isDark 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        />
      </div>

      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <p className="text-sm">
          <Calendar className="inline h-4 w-4 mr-1" />
          Budget period: {formData.start_date} to {formData.end_date}
        </p>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <label className="block text-sm font-medium mb-2">Budget Strategy</label>
        <div className="space-y-3">
          {[
            { value: 'envelope', label: 'Envelope Method', desc: 'Allocate specific amounts to categories' },
            { value: '50_30_20', label: '50/30/20 Rule', desc: '50% needs, 30% wants, 20% savings' },
            { value: 'zero_based', label: 'Zero-Based', desc: 'Every dollar has a purpose' }
          ].map(strategy => (
            <label
              key={strategy.value}
              className={`flex items-start p-4 rounded-lg border cursor-pointer transition ${
                formData.strategy === strategy.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : isDark 
                    ? 'border-gray-700 hover:border-gray-600' 
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={strategy.value}
                checked={formData.strategy === strategy.value}
                onChange={(e) => setFormData({ ...formData, strategy: e.target.value as any })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">{strategy.label}</div>
                <div className="text-sm opacity-75">{strategy.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Analysis Period</label>
        <select
          value={formData.analysisMonths}
          onChange={(e) => setFormData({ ...formData, analysisMonths: parseInt(e.target.value) })}
          className={`w-full px-4 py-2 rounded-lg border ${
            isDark 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-200 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          <option value={1}>Last 1 month</option>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
        <p className="text-sm opacity-75 mt-2">
          AI will analyze your spending patterns from this period to suggest budget amounts
        </p>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {aiSuggestions ? (
        <>
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" />
            <span className="font-medium">AI Analysis Complete</span>
          </div>

          {aiSuggestions.suggested_budget && (
            <div className="space-y-4">
              <h4 className="font-medium">Suggested Budget</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {aiSuggestions.suggested_budget.map((item: any, index: number) => (
                  <div
                    key={index}
                    className={`flex justify-between p-3 rounded-lg ${
                      isDark ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-sm">{item.category_primary}</span>
                    <span className="font-medium">
                      ${(item.suggested_amount_cents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiSuggestions.recurring_patterns && aiSuggestions.recurring_patterns.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Detected Recurring Expenses</h4>
              <div className="space-y-2">
                {aiSuggestions.recurring_patterns.slice(0, 3).map((pattern: any, index: number) => (
                  <div
                    key={index}
                    className={`flex justify-between p-3 rounded-lg ${
                      isDark ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-sm">{pattern.merchant_pattern}</span>
                    <span className="text-sm opacity-75">
                      ${(pattern.amount_cents_mean / 100).toFixed(2)}/mo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiSuggestions.insights && (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
              <p className="text-sm">{aiSuggestions.insights}</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Analyzing your spending patterns...</p>
        </div>
      )}
    </motion.div>
  );

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return true;
      case 3:
        return aiSuggestions !== null;
      default:
        return false;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isDark ? 'bg-black/50' : 'bg-gray-900/50'
    }`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-2xl rounded-xl shadow-xl ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Create Budget with AI</h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center mb-8">
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step >= i
                      ? 'bg-indigo-600 text-white'
                      : isDark
                        ? 'bg-gray-800 text-gray-400'
                        : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step > i ? <Check className="h-5 w-5" /> : i}
                </div>
                {i < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > i
                      ? 'bg-indigo-600'
                      : isDark
                        ? 'bg-gray-800'
                        : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onCancel()}
              disabled={loading}
              className={`px-6 py-2 rounded-lg flex items-center ${
                isDark
                  ? 'bg-gray-800 hover:bg-gray-700'
                  : 'bg-gray-200 hover:bg-gray-300'
              } transition disabled:opacity-50`}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <button
              onClick={() => {
                if (step === 2) {
                  handleAnalyze();
                } else if (step === 3) {
                  handleCreate();
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={loading || !canProceed()}
              className={`px-6 py-2 rounded-lg flex items-center ${
                loading || !canProceed()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              } transition`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : step === 3 ? (
                <>
                  Create Budget
                  <Check className="h-4 w-4 ml-1" />
                </>
              ) : step === 2 ? (
                <>
                  Analyze with AI
                  <TrendingUp className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};