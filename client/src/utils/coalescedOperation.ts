/**
 * Creates an asynchronous operation that coalesces repeated calls.
 *
 * While the operation is running, additional calls do not start another
 * operation. Instead, they request one additional execution after the
 * current operation finishes.
 *
 * Multiple calls received during the same execution are coalesced into
 * a single subsequent execution.
 *
 * Each call to createCoalescedOperation() creates an independent operation
 * with its own state.
 *
 * @param operation The asynchronous operation to execute.
 *
 * @example
 * const syncExpenses = createCoalescedOperation(syncExpensesWithApi)
 *
 * // Starts one sync.
 * void syncExpenses()
 *
 * // If called while the sync is running, these calls are coalesced
 * // into one additional sync after the current one finishes.
 * void syncExpenses()
 * void syncExpenses()
 *
 * // Result:
 * // sync → sync
 *
 * @example
 * // Different operations have independent state.
 * const syncExpenses = createCoalescedOperation(syncExpensesWithApi)
 * const syncCategories = createCoalescedOperation(syncCategoriesWithApi)
 *
 * // These operations can run concurrently.
 * void syncExpenses()
 * void syncCategories()
 */
export function createCoalescedOperation(
  operation: () => Promise<void>,
): () => Promise<void> {
  let promise: Promise<void> | null = null
  let requestedAgain = false

  return async function coalescedOperation(): Promise<void> {
    requestedAgain = true

    if (promise) {
      return promise
    }

    promise = (async () => {
      do {
        requestedAgain = false
        await operation()
      } while (requestedAgain)
    })()

    try {
      await promise
    } finally {
      promise = null
    }
  }
}