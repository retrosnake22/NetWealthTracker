import { supabase } from '@/lib/supabase'

// Data keys we sync to Supabase
const DATA_KEYS = [
  'assets', 'properties', 'liabilities', 'incomes',
  'expenseBudgets', 'expenseActuals', 'projectionSettings', 'userProfile',
  'whatIfConversations',
] as const

type SyncData = Record<string, unknown>

// Guard flag — when true, saveToCloud becomes a no-op.
// This prevents in-flight saves from re-upserting data after a reset.
let _syncPaused = false

export function isSyncPaused() { return _syncPaused }
export function setSyncPaused(paused: boolean) { _syncPaused = paused }

// ─── Sync Status (observable by UI) ───
type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'
type SyncListener = (status: SyncStatus, lastSaved: Date | null) => void

let _syncStatus: SyncStatus = 'idle'
let _lastSaved: Date | null = null
const _listeners = new Set<SyncListener>()

function setSyncStatus(status: SyncStatus) {
  _syncStatus = status
  if (status === 'saved') _lastSaved = new Date()
  _listeners.forEach(fn => fn(_syncStatus, _lastSaved))
}

export function onSyncStatus(listener: SyncListener): () => void {
  _listeners.add(listener)
  // Immediately fire with current status
  listener(_syncStatus, _lastSaved)
  return () => { _listeners.delete(listener) }
}

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

  setSyncStatus('saving')

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
    setSyncStatus('idle')
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
    setSyncStatus('error')
    return false
  }

  console.log('[sync] Saved to cloud:', Object.keys(payload).map(k => `${k}(${Array.isArray(payload[k]) ? (payload[k] as unknown[]).length : '✓'})`).join(', '))
  setSyncStatus('saved')
  return true
}

/**
 * Creates a debounced save function with cancel and flush support.
 * Waits `delay` ms after the last call before actually saving.
 */
export function createDebouncedSave(delay = 1500) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingUserId: string | null = null
  let pendingState: object | null = null

  function save(userId: string, storeState: object) {
    // Always keep a reference to the latest state for flush
    pendingUserId = userId
    pendingState = storeState
    setSyncStatus('saving')

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (pendingUserId && pendingState) {
        saveToCloud(pendingUserId, pendingState)
        pendingUserId = null
        pendingState = null
      }
    }, delay)
  }

  /** Immediately save any pending data (used on tab close / visibility change) */
  function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (pendingUserId && pendingState) {
      saveToCloud(pendingUserId, pendingState)
      pendingUserId = null
      pendingState = null
    }
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    pendingUserId = null
    pendingState = null
  }

  function hasPending() {
    return pendingUserId !== null && pendingState !== null
  }

  return { save, cancel, flush, hasPending }
}

// ─── Sync Controller (singleton) ───
// Shared between App.tsx (sets up sync) and AppLayout.tsx (needs to pause for reset)

interface SyncController {
  /** Cancel any pending debounced save */
  cancelPendingSave: () => void
  /** Flush pending save immediately (for tab close) */
  flushPendingSave: () => void
  /** Pause sync: sets paused flag, cancels pending save, unsubscribes from store */
  pauseSync: () => void
  /** Clear the paused flag (called on reload/re-init) */
  resumeSyncFlag: () => void
  /** Re-subscribe to store changes — call with subscriber setup fn */
  resumeSync: (setupSubscriber: () => (() => void)) => void
}

let _cancelPendingSave: (() => void) | null = null
let _flushPendingSave: (() => void) | null = null
let _unsubscribe: (() => void) | null = null

export const syncController: SyncController = {
  cancelPendingSave() {
    _cancelPendingSave?.()
  },

  flushPendingSave() {
    _flushPendingSave?.()
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
 * Register the debounced save's cancel + flush fns with the controller.
 * Called once during App init.
 */
export function registerDebouncedCancel(cancelFn: () => void) {
  _cancelPendingSave = cancelFn
}

export function registerDebouncedFlush(flushFn: () => void) {
  _flushPendingSave = flushFn
}

/**
 * Register the store unsubscribe fn with the controller.
 * Called each time we subscribe to store changes.
 */
export function registerStoreUnsubscribe(unsub: (() => void) | null) {
  _unsubscribe = unsub
}
