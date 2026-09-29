/**
 * Creates an asynchronous operation that runs sequentially for each key.
 *
 * An operation can occupy one or multiple keys. If another operation is
 * already running for any of the same keys, the new operation waits until
 * all conflicting operations finish.
 *
 * Operations for different keys can run concurrently.
 *
 * Each call to createSequentialByKeys() creates an independent operation
 * with its own set of active keys.
 *
 * @example
 * const sequentialExpenseOperation = createSequentialByKeys<string>();
 *
 * // Operations for the same expense are executed sequentially.
 * void sequentialExpenseOperation(["expense-1"], async () => {
 *   await updateExpense("expense-1");
 * });
 *
 * void sequentialExpenseOperation(["expense-1"], async () => {
 *   await deleteExpense("expense-1");
 * });
 *
 * // Result:
 * // updateExpense("expense-1") → deleteExpense("expense-1")
 *
 * @example
 * // An operation can occupy multiple keys.
 * void sequentialExpenseOperation(
 *   ["expense-1", "expense-2", "expense-3"],
 *   async () => {
 *     await syncExpenses(["expense-1", "expense-2", "expense-3"]);
 *   },
 * );
 *
 * // Any operation for one of these expenses waits for the sync.
 * void sequentialExpenseOperation(["expense-2"], async () => {
 *   await updateExpense("expense-2");
 * });
 *
 * // Result:
 * // syncExpenses(...) → updateExpense("expense-2")
 *
 * @example
 * // Operations for different keys can run concurrently.
 * void sequentialExpenseOperation(["expense-1"], async () => {
 *   await updateExpense("expense-1");
 * });
 *
 * void sequentialExpenseOperation(["expense-2"], async () => {
 *   await updateExpense("expense-2");
 * });
 *
 * // Both operations can run at the same time.
 *
 * @param keys Keys that the operation occupies while it is running.
 * @param operation Asynchronous operation to execute.
 */
export function createSequentialByKeys<TKey>() {
  const promises = new Map<TKey, Promise<void>>();

  return async function sequentialByKeys(
    keys: TKey[],
    operation: () => Promise<void>,
  ): Promise<void> {
    const uniqueKeys = [...new Set(keys)];

    const previousOperations = uniqueKeys
      .map((key) => promises.get(key))
      .filter((promise): promise is Promise<void> => promise !== undefined);

    if (previousOperations.length > 0) {
      await Promise.all(previousOperations);
    }

    const currentOperation = operation();

    uniqueKeys.forEach((key) => {
      promises.set(key, currentOperation);
    });

    try {
      await currentOperation;
    } finally {
      uniqueKeys.forEach((key) => {
        if (promises.get(key) === currentOperation) {
          promises.delete(key);
        }
      });
    }
  };
}