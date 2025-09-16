import { supabase } from './supabase';

export interface StrategyConversionResult {
  success: boolean;
  changes: Array<{
    category: string;
    oldAmount: number;
    newAmount: number;
    change: number;
  }>;
  totalBudget: number;
  message?: string;
}

export async function convertBudgetStrategy(
  budgetId: string,
  workspaceId: string,
  newStrategy: '50_30_20' | 'envelope' | 'zero_based' | 'custom',
  userId: string
): Promise<StrategyConversionResult> {
  console.log('🤖 convertBudgetStrategy called with:', {
    budgetId,
    workspaceId,
    newStrategy,
    userId
  });
  
  try {
    // Get current budget and lines
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .single();

    if (budgetError || !budget) {
      console.error('❌ Budget not found:', budgetError);
      throw new Error('Budget not found');
    }
    
    console.log('📊 Found budget:', (budget as any).name, 'Current strategy:', (budget as any).strategy);

    const { data: budgetLines, error: linesError } = await supabase
      .from('budget_lines')
      .select('*')
      .eq('budget_id', budgetId);

    if (linesError || !budgetLines) {
      throw new Error('Budget lines not found');
    }

    // Calculate monthly income based on recent transactions
    const { data: incomeTransactions } = await supabase
      .from('feed_transactions')
      .select('amount_cents')
      .eq('workspace_id', workspaceId)
      .gt('amount_cents', 0) // Income is positive
      .gte('transaction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('transaction_date', new Date().toISOString().split('T')[0]);

    let monthlyIncome = 500000; // Default $5000
    if (incomeTransactions && incomeTransactions.length > 0) {
      const totalIncome = incomeTransactions.reduce((sum: number, t: any) => sum + t.amount_cents, 0);
      monthlyIncome = Math.round(totalIncome / 3); // Average over 3 months
    }
    
    console.log('💰 Monthly income calculated:', monthlyIncome, `($${(monthlyIncome / 100).toFixed(2)})`);
    console.log('📝 Found', budgetLines?.length || 0, 'budget lines to convert');

    // Get spending history for intelligent allocation
    const { data: spendingHistory } = await supabase
      .from('feed_transactions')
      .select('personal_finance_category_primary, amount_cents')
      .eq('workspace_id', workspaceId)
      .eq('direction', 'outflow') // Only expenses
      .eq('status', 'posted') // Only posted transactions
      .gte('transaction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('transaction_date', new Date().toISOString().split('T')[0]);

    const categorySpending: Record<string, number> = {};
    if (spendingHistory) {
      console.log('📊 Found', spendingHistory.length, 'transactions for spending analysis');
      spendingHistory.forEach((tx: any) => {
        const category = tx.personal_finance_category_primary || 'OTHER';
        categorySpending[category] = (categorySpending[category] || 0) + Math.abs(tx.amount_cents);
      });
      
      // Log spending by category
      console.log('💰 Historical spending by category (last 90 days):');
      Object.entries(categorySpending).forEach(([cat, amount]) => {
        console.log(`  ${cat}: $${(amount / 100).toFixed(2)}`);
      });
    }

    const changes: Array<{ category: string; oldAmount: number; newAmount: number; change: number }> = [];
    let totalNewBudget = 0;

    console.log('🔄 Converting to strategy:', newStrategy);

    if (newStrategy === '50_30_20') {
      console.log('📊 Applying 50/30/20 rule...');
      // Categorize budget lines into needs, wants, and savings
      const needs: typeof budgetLines = [];
      const wants: typeof budgetLines = [];
      const savings: typeof budgetLines = [];

      budgetLines.forEach((line: any) => {
        const categoryKey = line.line_name || line.category_primary || line.name || '';
        const name = categoryKey.toLowerCase().replace(/_/g, ' ');
        
        // Categorize based on common patterns
        let categoryType = '';
        if (
          name.includes('rent') || 
          name.includes('mortgage') || 
          name.includes('utilities') || 
          name.includes('insurance') || 
          name.includes('loan') ||
          name.includes('medical') ||
          name.includes('groceries') ||
          (name.includes('food') && !name.includes('dining')) ||
          name.includes('transfer') ||
          name.includes('payment')
        ) {
          categoryType = 'NEEDS';
          (needs as any).push(line);
        } else if (
          name.includes('entertainment') || 
          name.includes('dining') || 
          name.includes('shopping') || 
          name.includes('hobbies') ||
          (name.includes('personal') && !name.includes('care')) ||
          name.includes('merchandise')
        ) {
          categoryType = 'WANTS';
          (wants as any).push(line);
        } else if (
          name.includes('savings') || 
          name.includes('investment') || 
          name.includes('retirement')
        ) {
          categoryType = 'SAVINGS';
          (savings as any).push(line);
        } else {
          // Default to needs for unclassified
          categoryType = 'NEEDS (default)';
          (needs as any).push(line);
        }
        
        console.log(`  Categorizing: ${categoryKey} -> ${categoryType}`);
      });

      // Calculate allocations
      const needsAllocation = Math.round(monthlyIncome * 0.50);
      const wantsAllocation = Math.round(monthlyIncome * 0.30);
      const savingsAllocation = Math.round(monthlyIncome * 0.20);

      // Distribute within each category proportionally based on historical spending
      const distributeAllocation = (lines: typeof budgetLines, allocation: number, categoryType: string) => {
        if (lines.length === 0) return;

        console.log(`\n  Distributing ${categoryType} allocation: $${(allocation / 100).toFixed(2)}`);
        
        // Calculate total historical spending for these categories
        const totalHistorical = lines.reduce((sum: number, line: any) => {
          const categoryKey = line.line_name || line.category_primary || line.name;
          const historicalAmount = categorySpending[categoryKey] || 0;
          
          // If no historical spending, use a minimum amount
          if (historicalAmount === 0) {
            console.log(`    No historical spending for ${categoryKey}, using minimum`);
            return sum + 10000; // $100 minimum
          }
          return sum + historicalAmount;
        }, 0);

        lines.forEach((line: any) => {
          const categoryKey = line.line_name || line.category_primary || line.name;
          let historicalAmount = categorySpending[categoryKey] || 0;
          
          // If no historical spending for this category, use minimum
          if (historicalAmount === 0) {
            historicalAmount = 10000; // $100 minimum
          }
          
          const proportion = totalHistorical > 0 ? historicalAmount / totalHistorical : 1 / lines.length;
          let newAmount = Math.round(allocation * proportion);
          
          // Add a buffer to historical spending for safety (10% buffer)
          const minRequired = Math.round(historicalAmount / 3 * 1.1); // Monthly average + 10%
          if (categoryType === 'NEEDS' && newAmount < minRequired) {
            console.log(`    ${categoryKey}: Adjusting from $${(newAmount/100).toFixed(2)} to $${(minRequired/100).toFixed(2)} (min required)`);
            newAmount = minRequired;
          }
          
          console.log(`    ${categoryKey}: $${(newAmount/100).toFixed(2)} (Historical: $${(historicalAmount/100).toFixed(2)})`);

          changes.push({
            category: categoryKey,
            oldAmount: line.budgeted_amount_cents,
            newAmount,
            change: newAmount - line.budgeted_amount_cents
          });

          totalNewBudget += newAmount;
        });
      };

      distributeAllocation(needs, needsAllocation, 'needs');
      distributeAllocation(wants, wantsAllocation, 'wants');
      distributeAllocation(savings, savingsAllocation, 'savings');

    } else if (newStrategy === 'zero_based') {
      // Zero-based: Start from zero and rebuild based on actual spending
      budgetLines.forEach((line: any) => {
        const categoryKey = line.line_name || line.category_primary || line.name;
        const historicalSpending = categorySpending[categoryKey] || 0;
        // For zero-based, we'll set initial amounts to average historical spending
        const newAmount = Math.round(historicalSpending / 3); // Monthly average

        changes.push({
          category: categoryKey,
          oldAmount: line.budgeted_amount_cents,
          newAmount,
          change: newAmount - line.budgeted_amount_cents
        });

        totalNewBudget += newAmount;
      });

    } else if (newStrategy === 'envelope') {
      // Envelope: Keep current allocations or restore to sensible defaults
      budgetLines.forEach((line: any) => {
        const categoryKey = line.line_name || line.category_primary || line.name;
        // If amounts are zero (from zero-based), restore based on historical spending
        let newAmount = line.budgeted_amount_cents;
        
        if (newAmount === 0) {
          const historicalSpending = categorySpending[categoryKey] || 0;
          newAmount = Math.round(historicalSpending / 3 * 1.1); // Add 10% buffer
        }

        changes.push({
          category: categoryKey,
          oldAmount: line.budgeted_amount_cents,
          newAmount,
          change: newAmount - line.budgeted_amount_cents
        });

        totalNewBudget += newAmount;
      });
    }

    console.log('📝 Generated', changes.length, 'changes');
    console.log('💾 Applying changes to database...');
    
    // Debug: Log all budget lines and their categories
    console.log('📋 Budget lines available:');
    budgetLines.forEach((l: any) => {
      console.log(`  - ID: ${l.id}, line_name: ${l.line_name}, name: ${l.name}, category_primary: ${l.category_primary}`);
    });
    
    // Apply the changes to the database
    for (const change of changes) {
      const line = budgetLines.find((l: any) => {
        const lineCategory = l.line_name || l.category_primary || l.name;
        return lineCategory === change.category;
      });
      
      if (line) {
        console.log(`  ✅ Updating ${change.category} (ID: ${(line as any).id}): ${change.oldAmount} → ${change.newAmount}`);
        const { error } = await (supabase as any)
          .from('budget_lines')
          .update({ budgeted_amount_cents: change.newAmount })
          .eq('id', (line as any).id);
        
        if (error) {
          console.error(`  ❌ Error updating ${change.category}:`, error);
        } else {
          console.log(`  ✓ Successfully updated ${change.category}`);
        }
      } else {
        console.warn(`  ⚠️ Could not find budget line for category: ${change.category}`);
      }
    }

    // Update budget total and strategy
    console.log('💾 Updating budget total to:', totalNewBudget, `($${(totalNewBudget / 100).toFixed(2)})`);
    const { error: budgetUpdateError } = await (supabase as any)
      .from('budgets')
      .update({
        total_budgeted_cents: totalNewBudget,
        strategy: newStrategy
      })
      .eq('id', budgetId);
    
    if (budgetUpdateError) {
      console.error('❌ Error updating budget:', budgetUpdateError);
    }

    // Log the strategy change
    await (supabase as any)
      .from('budget_strategy_changes')
      .insert({
        budget_id: budgetId,
        old_strategy: (budget as any).strategy || 'envelope',
        new_strategy: newStrategy,
        created_by: userId,
        conversion_notes: {
          changes,
          totalBudget: totalNewBudget,
          monthlyIncome
        }
      });

    console.log('✅ Strategy conversion complete!');
    return {
      success: true,
      changes,
      totalBudget: totalNewBudget,
      message: `Successfully converted to ${newStrategy} strategy`
    };

  } catch (error) {
    console.error('❌ Strategy conversion error:', error);
    return {
      success: false,
      changes: [],
      totalBudget: 0,
      message: error instanceof Error ? error.message : 'Failed to convert strategy'
    };
  }
}

export function getStrategyDescription(strategy: string): string {
  switch (strategy) {
    case '50_30_20':
      return 'Allocates 50% to needs, 30% to wants, and 20% to savings based on your income';
    case 'zero_based':
      return 'Starts from zero and rebuilds budget based on your actual spending patterns';
    case 'envelope':
      return 'Traditional envelope budgeting with fixed amounts per category';
    default:
      return 'Custom budget strategy';
  }
}

export function categorizeExpense(categoryName: string): 'needs' | 'wants' | 'savings' {
  const name = categoryName.toLowerCase();
  
  if (
    name.includes('rent') || 
    name.includes('mortgage') || 
    name.includes('utilities') || 
    name.includes('insurance') || 
    name.includes('loan') ||
    name.includes('medical') ||
    name.includes('groceries') ||
    (name.includes('food') && !name.includes('dining'))
  ) {
    return 'needs';
  } else if (
    name.includes('entertainment') || 
    name.includes('dining') || 
    name.includes('shopping') || 
    name.includes('hobbies') ||
    name.includes('personal')
  ) {
    return 'wants';
  } else if (
    name.includes('savings') || 
    name.includes('investment') || 
    name.includes('retirement')
  ) {
    return 'savings';
  }
  
  return 'needs'; // Default to needs
}