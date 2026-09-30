/**
 * Ensures that concurrent calls share the same in-flight operation.
 *
 * While the wrapped operation is running, all calls return the same Promise.
 * Once the operation settles, the next call starts a new operation.
 *
 * The result is not cached after the operation completes.
 *
 * @param fn - Asynchronous operation to execute.
 * @returns A function that executes the operation with single-flight semantics.
 *
 * @example
 * const refresh = singleFlight(() => authApi.refresh())
 *
 * // Only one refresh request is sent.
 * const [first, second, third] = await Promise.all([
 *   refresh(),
 *   refresh(),
 *   refresh(),
 * ])
 *
 * // A new request is sent after the previous one has completed.
 * await refresh()
 */
export function singleFlight<T>(fn: () => Promise<T>) {
  let promise: Promise<T> | null = null;

  return () => {
    if (!promise) {
      promise = fn().finally(() => {
        promise = null;
      });
    }

    return promise;
  };
}
