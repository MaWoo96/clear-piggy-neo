// Helper functions for 3-tier category system

export interface Transaction {
  id: string;
  // Plaid categories (original, never changes)
  personal_finance_category_primary?: string | null;
  personal_finance_category_detailed?: string | null;
  
  // AI categories (set once, never changes)
  ai_category_primary?: string | null;
  ai_category_secondary?: string | null;
  ai_category_confidence?: number | null;
  
  // User categories (manual corrections, what gets displayed)
  user_category_primary?: string | null;
  user_category_secondary?: string | null;
  user_category_updated_at?: string | null;
  
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  parent_category_id?: string;
  color?: string;
  [key: string]: any;
}

/**
 * Get the display category for a transaction
 * Priority: User > AI > None
 */
export function getDisplayCategory(transaction: Transaction): {
  primary: string | null;
  secondary: string | null;
  source: 'user' | 'ai' | 'none';
} {
  // First priority: User corrections
  if (transaction.user_category_primary || transaction.user_category_secondary) {
    return {
      primary: transaction.user_category_primary || null,
      secondary: transaction.user_category_secondary || null,
      source: 'user'
    };
  }
  
  // Second priority: AI suggestions
  if (transaction.ai_category_primary || transaction.ai_category_secondary) {
    return {
      primary: transaction.ai_category_primary || null,
      secondary: transaction.ai_category_secondary || null,
      source: 'ai'
    };
  }
  
  // No category set
  return {
    primary: null,
    secondary: null,
    source: 'none'
  };
}

/**
 * Save a user's category correction
 * This preserves the original AI categories for training
 */
export async function saveUserCategoryCorrection(
  supabase: any,
  transactionId: string,
  categoryId: string,
  categories: Category[],
  userId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate userId - convert empty string to null
    const validUserId = userId && userId !== '' ? userId : null;
    
    // Handle empty category (uncategorized)
    if (!categoryId || categoryId === '' || categoryId === 'uncategorized') {
      // Clear user category selections
      const { error } = await supabase
        .from('feed_transactions')
        .update({
          user_category_primary: null,
          user_category_secondary: null,
          user_category_updated_at: new Date().toISOString(),
          user_category_updated_by: validUserId
        })
        .eq('id', transactionId);
      
      if (error) {
        console.error('Error clearing user category:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    }
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return { success: false, error: 'Category not found' };
    }
    
    // Determine if this is a parent or child category
    let updateData: any = {
      user_category_updated_at: new Date().toISOString(),
      user_category_updated_by: validUserId
    };
    
    if (category.parent_category_id) {
      // It's a child category - set both parent and child
      const parentCategory = categories.find(c => c.id === category.parent_category_id);
      updateData.user_category_primary = parentCategory?.id || null;
      updateData.user_category_secondary = category.id;
    } else {
      // It's a parent category - only set parent
      updateData.user_category_primary = category.id;
      updateData.user_category_secondary = null;
    }
    
    const { error } = await supabase
      .from('feed_transactions')
      .update(updateData)
      .eq('id', transactionId);
    
    if (error) {
      console.error('Error saving user category:', error);
      return { success: false, error: error.message };
    }
    
    // Update merchant intelligence to learn from user correction
    // The database trigger will automatically handle this, but we can also
    // explicitly update it for immediate effect
    try {
      const { data: transaction } = await supabase
        .from('feed_transactions')
        .select('workspace_id, merchant_name')
        .eq('id', transactionId)
        .single();
      
      if (transaction && transaction.merchant_name && categoryId) {
        // Use the simpler function that doesn't require type conversion
        try {
          console.log(`Category updated: ${transaction.merchant_name} → ${categoryId}`);
          
          // Call the simplified function that doesn't need confidence parameter
          supabase.rpc('record_merchant_learning', {
            p_workspace_id: transaction.workspace_id,
            p_merchant_name: transaction.merchant_name,
            p_category_id: categoryId
          }).then(({ error }: { data: any; error: any }) => {
            if (!error) {
              console.log('AI learning recorded');
            }
          }).catch(() => {
            // Silently ignore if function doesn't exist
            // The category save is the important part
          });
        } catch (error) {
          // Ignore any errors - the category save is more important
        }
      }
    } catch (error) {
      // Don't fail the main operation if learning fails
      console.error('Failed to update merchant intelligence:', error);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in saveUserCategoryCorrection:', error);
    return { success: false, error: 'Failed to save category' };
  }
}

/**
 * Record a learning event when user corrects AI categorization
 */
async function recordLearningEvent(
  supabase: any,
  transactionId: string,
  newCategoryId: string,
  userId: string | null
): Promise<void> {
  try {
    // Get the transaction to see what AI suggested vs what user selected
    const { data: transaction } = await supabase
      .from('feed_transactions')
      .select('ai_category_primary, ai_category_secondary, merchant_name')
      .eq('id', transactionId)
      .single();
    
    if (transaction && (transaction.ai_category_primary || transaction.ai_category_secondary)) {
      // User disagreed with AI - record this for training
      await supabase
        .from('category_learning_events')
        .insert({
          transaction_id: transactionId,
          merchant_name: transaction.merchant_name,
          ai_suggested_category: transaction.ai_category_secondary || transaction.ai_category_primary,
          user_selected_category: newCategoryId,
          created_by: userId
        });
    }
  } catch (error) {
    // Don't fail the main operation if learning event fails
    console.error('Failed to record learning event:', error);
  }
}

/**
 * Get category display info with hierarchy
 */
export function getCategoryDisplayInfo(
  transaction: Transaction,
  categories: Category[]
): {
  parent: string | null;
  child: string | null;
  color: string;
  confidence: number | null;
  source: 'user' | 'ai' | 'none';
  isUserCorrected: boolean;
} {
  const displayCat = getDisplayCategory(transaction);
  
  if (displayCat.source === 'none') {
    return {
      parent: null,
      child: null,
      color: '#9ca3af',
      confidence: null,
      source: 'none',
      isUserCorrected: false
    };
  }
  
  // Get the actual category objects
  const primaryCat = displayCat.primary ? 
    categories.find(c => c.id === displayCat.primary) : null;
  const secondaryCat = displayCat.secondary ? 
    categories.find(c => c.id === displayCat.secondary) : null;
  
  // Determine parent and child
  let parent: string | null = null;
  let child: string | null = null;
  let color = '#9ca3af';
  
  if (secondaryCat) {
    // We have a child category
    child = secondaryCat.name;
    color = secondaryCat.color || '#9ca3af';
    
    // Find its parent
    if (secondaryCat.parent_category_id) {
      const parentCat = categories.find(c => c.id === secondaryCat.parent_category_id);
      parent = parentCat?.name || null;
      if (!secondaryCat.color && parentCat?.color) {
        color = parentCat.color;
      }
    }
  } else if (primaryCat) {
    // Only have parent category
    if (primaryCat.parent_category_id) {
      // This is actually a child category
      child = primaryCat.name;
      const parentCat = categories.find(c => c.id === primaryCat.parent_category_id);
      parent = parentCat?.name || null;
    } else {
      // This is a parent category
      parent = primaryCat.name;
    }
    color = primaryCat.color || '#9ca3af';
  }
  
  return {
    parent,
    child,
    color,
    confidence: displayCat.source === 'ai' ? transaction.ai_category_confidence || null : null,
    source: displayCat.source,
    isUserCorrected: displayCat.source === 'user'
  };
}