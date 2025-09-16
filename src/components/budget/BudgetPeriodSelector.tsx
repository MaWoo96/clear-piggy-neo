import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CalendarDays, CalendarRange, Info } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';

interface BudgetPeriodSelectorProps {
  onPeriodSelect: (startDate: string, endDate: string, periodType: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
  showValidation?: boolean;
}

type PeriodPreset = 'monthly' | 'biweekly' | 'quarterly' | 'annually' | 'custom';

interface PresetOption {
  type: PeriodPreset;
  label: string;
  description: string;
  icon: React.ReactNode;
  getDates: () => { start: Date; end: Date };
}

export const BudgetPeriodSelector: React.FC<BudgetPeriodSelectorProps> = ({
  onPeriodSelect,
  initialStartDate,
  initialEndDate,
  showValidation = true
}) => {
  const { isDark } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('monthly');
  const [customStartDate, setCustomStartDate] = useState<string>(
    initialStartDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    initialEndDate || format(addDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [periodLength, setPeriodLength] = useState<number>(0);
  const [validationMessage, setValidationMessage] = useState<string>('');

  const presetOptions: PresetOption[] = [
    {
      type: 'monthly',
      label: 'Monthly',
      description: 'Standard monthly budget period',
      icon: <Calendar className="h-5 w-5" />,
      getDates: () => {
        const start = startOfMonth(new Date());
        const end = endOfMonth(start);
        return { start, end };
      }
    },
    {
      type: 'biweekly',
      label: 'Bi-weekly',
      description: 'Every two weeks (14 days)',
      icon: <CalendarDays className="h-5 w-5" />,
      getDates: () => {
        const start = new Date();
        const end = addWeeks(start, 2);
        return { start, end: addDays(end, -1) };
      }
    },
    {
      type: 'quarterly',
      label: 'Quarterly',
      description: 'Three month period',
      icon: <CalendarRange className="h-5 w-5" />,
      getDates: () => {
        const start = startOfMonth(new Date());
        const end = endOfMonth(addMonths(start, 2));
        return { start, end };
      }
    },
    {
      type: 'annually',
      label: 'Annual',
      description: 'Full year budget',
      icon: <CalendarRange className="h-5 w-5" />,
      getDates: () => {
        const start = new Date(new Date().getFullYear(), 0, 1);
        const end = new Date(new Date().getFullYear(), 11, 31);
        return { start, end };
      }
    },
    {
      type: 'custom',
      label: 'Custom',
      description: 'Choose your own dates',
      icon: <CalendarRange className="h-5 w-5" />,
      getDates: () => {
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate)
        };
      }
    }
  ];

  useEffect(() => {
    calculatePeriodLength();
    validatePeriod();
  }, [customStartDate, customEndDate, selectedPreset]);

  const calculatePeriodLength = () => {
    let start: Date, end: Date;
    
    if (selectedPreset === 'custom') {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
    } else {
      const preset = presetOptions.find(p => p.type === selectedPreset);
      const dates = preset?.getDates();
      start = dates?.start || new Date();
      end = dates?.end || new Date();
    }

    const days = differenceInDays(end, start) + 1;
    setPeriodLength(days);
  };

  const validatePeriod = () => {
    if (!showValidation) return;

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const days = differenceInDays(end, start) + 1;

    if (selectedPreset === 'custom') {
      if (days < 1) {
        setValidationMessage('End date must be after start date');
      } else if (days > 400) {
        setValidationMessage('Period cannot exceed 400 days');
      } else {
        setValidationMessage('');
      }
    } else {
      setValidationMessage('');
    }
  };

  const handlePresetSelect = (preset: PeriodPreset) => {
    setSelectedPreset(preset);
    
    if (preset !== 'custom') {
      const option = presetOptions.find(p => p.type === preset);
      const dates = option?.getDates();
      if (dates) {
        const startStr = format(dates.start, 'yyyy-MM-dd');
        const endStr = format(dates.end, 'yyyy-MM-dd');
        setCustomStartDate(startStr);
        setCustomEndDate(endStr);
        onPeriodSelect(startStr, endStr, preset);
      }
    }
  };

  const handleCustomDateChange = () => {
    if (selectedPreset === 'custom' && !validationMessage) {
      onPeriodSelect(customStartDate, customEndDate, 'custom');
    }
  };

  const getPeriodSummary = () => {
    const weeks = Math.floor(periodLength / 7);
    const months = Math.floor(periodLength / 30);
    
    if (periodLength === 1) return '1 day';
    if (periodLength < 7) return `${periodLength} days`;
    if (periodLength < 30) return `${weeks} week${weeks > 1 ? 's' : ''} (${periodLength} days)`;
    if (periodLength < 365) return `${months} month${months > 1 ? 's' : ''} (${periodLength} days)`;
    return `1 year (${periodLength} days)`;
  };

  return (
    <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Budget Period</h3>
      </div>

      {/* Preset Options */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {presetOptions.map((option) => (
          <motion.button
            key={option.type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePresetSelect(option.type)}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedPreset === option.type
                ? isDark
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-blue-500 bg-blue-50'
                : isDark
                  ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`${
                selectedPreset === option.type
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {option.icon}
              </div>
              <div>
                <p className={`font-medium ${
                  selectedPreset === option.type
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      {selectedPreset === 'custom' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  handleCustomDateChange();
                }}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  handleCustomDateChange();
                }}
                min={customStartDate}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          {validationMessage && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
              {validationMessage}
            </div>
          )}
        </motion.div>
      )}

      {/* Period Summary */}
      <div className={`p-4 rounded-lg ${
        isDark ? 'bg-gray-700' : 'bg-gray-100'
      }`}>
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Selected Period
            </p>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <span className="font-medium">Dates:</span>{' '}
                {format(new Date(customStartDate), 'MMM d, yyyy')} -{' '}
                {format(new Date(customEndDate), 'MMM d, yyyy')}
              </p>
              <p>
                <span className="font-medium">Length:</span> {getPeriodSummary()}
              </p>
              {selectedPreset !== 'custom' && (
                <p>
                  <span className="font-medium">Type:</span> {selectedPreset.charAt(0).toUpperCase() + selectedPreset.slice(1)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Tip:</strong> {
            selectedPreset === 'monthly' 
              ? 'Monthly budgets align well with most bills and paychecks.'
              : selectedPreset === 'biweekly'
              ? 'Bi-weekly budgets work great if you\'re paid every two weeks.'
              : selectedPreset === 'quarterly'
              ? 'Quarterly budgets help with long-term planning and seasonal expenses.'
              : selectedPreset === 'annually'
              ? 'Annual budgets provide a complete overview of your yearly finances.'
              : 'Custom periods are perfect for specific goals or irregular income schedules.'
          }
        </p>
      </div>
    </div>
  );
};