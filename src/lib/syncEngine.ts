import { supabase } from '@/lib/supabase'

// Data keys we sync to Supabase
const DATA_KEYS = [
  'assets', 'properties', 'liabilities', 'incomes',
  'expenseBudgets', 'expenseActuals', 'projectionSettings',
] as const

type SyncData = Record<string, unknown>

/**
 * Load finance data from Supabase for the current user.
 * Returns null if no cloud data exists yet.
 */
export async function loadFromCloud(userId: string): Promise<SyncData | null> {
  const { data, error } = await supabase
    .from('user_finance_data')
    .select('data')
    .eq('user_id', userId)
    .single()

  if (error) {
    // PGRST116 = no rows found — first time user, not an error
    if (error.code === 'PGRST116') return null
    console.error('[sync] Failed to load from cloud:', error.message)
    return null
  }

  return data?.data as SyncData ?? null
}

/**
 * Save finance data to Supabase (upsert).
 */
export async function saveToCloud(userId: string, storeState: SyncData): Promise<boolean> {
  // Extract only the data keys (not functions)
  const payload: SyncData = {}
  for (const key of DATA_KEYS) {
    if (key in storeState) {
      payload[key] = storeState[key]
    }
  }

  const { error } = await supabase
    .from('user_finance_data')
    .upsert({
      user_id: userId,
      data: payload,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('[sync] Failed to save to cloud:', error.message)
    return false
  }

  return true
}

/**
 * Creates a debounced save function.
 * Waits `delay` ms after the last call before actually saving.
 */
export function createDebouncedSave(delay = 1500) {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (userId: string, storeState: SyncData) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      saveToCloud(userId, storeState)
    }, delay)
  }
}
