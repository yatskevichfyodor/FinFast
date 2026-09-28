/**
 * Creates a function for executing asynchronous operations sequentially
 * for the same key.
 *
 * Operations with the same key wait for the previous operation to finish.
 * Operations with different keys can run concurrently.
 *
 * Each call to createSequentialByKey() creates an independent operation queue.
 *
 * @template TKey The type of the key used to group operations.
 *
 * @example
 * const sequentialExpenseOperation = createSequentialByKey<string>()
 *
 * async function createExpense(expense: Expense) {
 *   await sequentialExpenseOperation(expense.id, async () => {
 *     await expenseApi.createExpense(expense)
 *   })
 * }
 *
 * async function updateExpense(expense: Expense) {
 *   await sequentialExpenseOperation(expense.id, async () => {
 *     await expenseApi.updateExpense(expense.id, expense)
 *   })
 * }
 *
 * // The update waits until the create operation is finished.
 * void createExpense(expense)
 * void updateExpense(expense)
 *
 * // Operations for different expenses can run concurrently.
 * void createExpense(expenseA)
 * void createExpense(expenseB)
 */
export function createSequentialByKey<TKey>() {
  const promises = new Map<TKey, Promise<void>>()

  return async function sequentialByKey(
    key: TKey,
    operation: () => Promise<void>,
  ): Promise<void> {
    const previousOperation = promises.get(key)

    if (previousOperation) {
      await previousOperation
    }

    const currentOperation = operation()
    promises.set(key, currentOperation)

    try {
      await currentOperation
    } finally {
      if (promises.get(key) === currentOperation) {
        promises.delete(key)
      }
    }
  }
}