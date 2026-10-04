/**
 * Creates a wrapper that allows only the result of the latest invocation
 * to be applied.
 *
 * If the wrapped operation is called again before a previous invocation
 * completes, the previous invocation is still allowed to finish, but its
 * result is discarded.
 *
 * This is useful for preventing stale asynchronous results from overwriting
 * state when the same operation can be triggered multiple times.
 *
 * Example:
 *
 * const runLatest = createLatestOnly();
 *
 * async function loadData() {
 *   const data = await runLatest(() => api.getData());
 *
 *   if (data === undefined) {
 *     return;
 *   }
 *
 *   state.value = data;
 * }
 *
 * If loadData() is called twice:
 *
 * 1. First request starts.
 * 2. Second request starts and becomes the latest request.
 * 3. If the first request finishes after the second one, its result is
 *    discarded.
 * 4. Only the second request can return a result.
 *
 * The wrapped operation is not cancelled. It continues running in the
 * background; only its result is ignored.
 */
export function createLatestOnly() {
  let latestRequestId = 0

  return async function runLatest<T>(
    operation: () => Promise<T>,
  ): Promise<T | undefined> {
    const requestId = ++latestRequestId

    const result = await operation()

    if (requestId !== latestRequestId) {
      return undefined
    }

    return result
  }
}