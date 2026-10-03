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

  function createDeferred() {
    let resolve!: () => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  }

  function run(
    keys: (TKey | typeof ALL_KEY)[],
    operation: () => Promise<void>,
  ): Promise<void> {
    const uniqueKeys = [...new Set(keys)];
    const isAll = uniqueKeys.includes(ALL_KEY);

    const previousOperations = new Set<Promise<void>>();

    if (isAll) {
      // ALL waits for every operation that is currently registered,
      // including a previous ALL.
      for (const promise of promises.values()) {
        previousOperations.add(promise);
      }
    } else {
      // Keyed operation waits for its own keys.
      for (const key of uniqueKeys) {
        const previousOperation = promises.get(key);

        if (previousOperation) {
          previousOperations.add(previousOperation);
        }
      }

      // Keyed operation waits for the current ALL barrier.
      const allOperation = promises.get(ALL_KEY);

      if (allOperation) {
        previousOperations.add(allOperation);
      }
    }

    const current = createDeferred();

    // Register BEFORE waiting for previous operations.
    for (const key of uniqueKeys) {
      promises.set(key, current.promise);
    }

    void (async () => {
      try {
        await Promise.all(previousOperations);
        await operation();
        current.resolve();
      } catch (error) {
        current.reject(error);
      } finally {
        for (const key of uniqueKeys) {
          if (promises.get(key) === current.promise) {
            promises.delete(key);
          }
        }
      }
    })();

    return current.promise;
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
