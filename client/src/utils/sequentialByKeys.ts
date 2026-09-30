/**
 * Creates a utility for sequentializing asynchronous operations by keys.
 *
 * Semantics:
 * - `byKey(key, operation)` waits for a previous operation using the same key.
 * - `byKeys(keys, operation)` waits for previous operations using any of the
 *   specified keys. The operation occupies all specified keys while running.
 * - `all(operation)` waits for all currently running operations and blocks
 *   all keyed operations while it is running.
 *
 * Operations using different keys can run concurrently.
 *
 * Example:
 *
 * const sequentialExpenseOperation = createSequentialByKeys<string>();
 *
 * await sequentialExpenseOperation.byKey(expenseId, async () => {
 *   await updateExpense(expenseId);
 * });
 *
 * await sequentialExpenseOperation.byKeys(
 *   [expenseId1, expenseId2],
 *   async () => {
 *     await syncExpenses([expenseId1, expenseId2]);
 *   },
 * );
 *
 * await sequentialExpenseOperation.all(async () => {
 *   const expenses = await loadAllExpenses();
 *   await reconcileExpenses(expenses);
 * });
 */
export function createSequentialByKeys<TKey>() {
  const ALL_KEY = Symbol("ALL");
  const promises = new Map<TKey | typeof ALL_KEY, Promise<void>>();

  async function run(
    keys: (TKey | typeof ALL_KEY)[],
    operation: () => Promise<void>,
  ): Promise<void> {
    const uniqueKeys = [...new Set(keys)];

    const previousOperations = new Set<Promise<void>>();

    for (const key of uniqueKeys) {
      const previousOperation = promises.get(key);

      if (previousOperation) {
        previousOperations.add(previousOperation);
      }
    }

    if (uniqueKeys.includes(ALL_KEY)) {
      // `all()` must wait for every currently running operation.
      for (const promise of promises.values()) {
        previousOperations.add(promise);
      }
    } else {
      // Keyed operations must wait for a currently running `all()`.
      const allOperation = promises.get(ALL_KEY);

      if (allOperation) {
        previousOperations.add(allOperation);
      }
    }

    if (previousOperations.size > 0) {
      await Promise.all(previousOperations);
    }

    const currentOperation = operation();

    for (const key of uniqueKeys) {
      promises.set(key, currentOperation);
    }

    try {
      await currentOperation;
    } finally {
      for (const key of uniqueKeys) {
        if (promises.get(key) === currentOperation) {
          promises.delete(key);
        }
      }
    }
  }

  return {
    byKey(
      key: TKey,
      operation: () => Promise<void>,
    ): Promise<void> {
      return run([key], operation);
    },

    byKeys(
      keys: TKey[],
      operation: () => Promise<void>,
    ): Promise<void> {
      return run(keys, operation);
    },

    all(
      operation: () => Promise<void>,
    ): Promise<void> {
      return run([ALL_KEY], operation);
    },
  };
}
