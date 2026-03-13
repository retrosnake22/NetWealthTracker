import { supabase } from '@/lib/supabase'

// Data keys we sync to Supabase
const DATA_KEYS = [
  'assets', 'properties', 'liabilities', 'incomes',
  'expenseBudgets', 'expenseActuals', 'projectionSettings', 'userProfile',
] as const

type SyncData = Record<string, unknown>

// Guard flag — when true, saveToCloud becomes a no-op.
// This prevents in-flight saves from re-upserting data after a reset.
let _syncPaused = false

export function isSyncPaused() { return _syncPaused }
export function setSyncPaused(paused: boolean) { _syncPaused = paused }

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
export async function saveToCloud(userId: string, storeState: object): Promise<boolean> {
  // If sync was paused (e.g. during reset), bail out even if this request
  // was started before the pause — prevents re-upserting deleted data
  if (_syncPaused) {
    console.log('[sync] Save skipped — sync is paused')
    return false
  }

  // Extract only the data keys (not functions)
  const payload: SyncData = {}
  for (const key of DATA_KEYS) {
    if (key in storeState) {
      payload[key] = (storeState as SyncData)[key]
    }
  }

  // Check again right before the network call in case pause happened
  // while we were building the payload
  if (_syncPaused) {
    console.log('[sync] Save skipped — sync is paused')
    return false
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
 * Creates a debounced save function with cancel support.
 * Waits `delay` ms after the last call before actually saving.
 */
export function createDebouncedSave(delay = 1500) {
  let timer: ReturnType<typeof setTimeout> | null = null

  function save(userId: string, storeState: object) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      saveToCloud(userId, storeState)
    }, delay)
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { save, cancel }
}

// ─── Sync Controller (singleton) ───
// Shared between App.tsx (sets up sync) and AppLayout.tsx (needs to pause for reset)

interface SyncController {
  /** Cancel any pending debounced save */
  cancelPendingSave: () => void
  /** Pause sync: sets paused flag, cancels pending save, unsubscribes from store */
  pauseSync: () => void
  /** Clear the paused flag (called on reload/re-init) */
  resumeSyncFlag: () => void
  /** Re-subscribe to store changes — call with subscriber setup fn */
  resumeSync: (setupSubscriber: () => (() => void)) => void
}

let _cancelPendingSave: (() => void) | null = null
let _unsubscribe: (() => void) | null = null

export const syncController: SyncController = {
  cancelPendingSave() {
    _cancelPendingSave?.()
  },

  pauseSync() {
    _syncPaused = true
    this.cancelPendingSave()
    if (_unsubscribe) {
      _unsubscribe()
      _unsubscribe = null
    }
  },

  resumeSyncFlag() {
    _syncPaused = false
  },

  resumeSync(setupSubscriber) {
    if (_unsubscribe) {
      _unsubscribe()
    }
    _unsubscribe = setupSubscriber()
  },
}

/**
 * Register the debounced save's cancel fn with the controller.
 * Called once during App init.
 */
export function registerDebouncedCancel(cancelFn: () => void) {
  _cancelPendingSave = cancelFn
}

/**
 * Register the store unsubscribe fn with the controller.
 * Called each time we subscribe to store changes.
 */
export function registerStoreUnsubscribe(unsub: (() => void) | null) {
  _unsubscribe = unsub
}
