import React, { memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  date: string;
  inflow: number;
  outflow: number;
}

interface TransactionChartProps {
  data: ChartDataPoint[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className={`text-xs font-medium ${
            entry.dataKey === 'inflow' ? 'text-green-400' : 'text-red-400'
          }`}>
            {entry.dataKey === 'inflow' ? 'Income' : 'Expenses'}: ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const TransactionChart = memo(({ data, height = 120 }: TransactionChartProps) => {
  // Don't render if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-gray-500 dark:text-gray-400">No transaction data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart 
        data={data} 
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          interval="preserveStartEnd"
        />
        
        <YAxis hide={true} />
        
        <Tooltip 
          content={<CustomTooltip />}
          animationDuration={200}
        />
        
        <Area 
          type="monotone" 
          dataKey="inflow" 
          stroke="#10b981" 
          strokeWidth={2}
          fill="url(#colorInflow)"
          animationDuration={300}
          isAnimationActive={true}
        />
        
        <Area 
          type="monotone" 
          dataKey="outflow" 
          stroke="#ef4444"
          strokeWidth={2} 
          fill="url(#colorOutflow)"
          animationDuration={300}
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if data actually changed
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
         prevProps.height === nextProps.height;
});

TransactionChart.displayName = 'TransactionChart';