/**
 * Creates a guard for asynchronous store operations.
 *
 * A guarded operation is considered valid only if:
 * - it is the latest operation started through this guard;
 * - the relevant store state has not changed while it was running.
 *
 * The guard does not change or return the operation result.
 * Instead, the supplied callback is executed only for a valid result.
 *
 * This allows the operation itself to return `undefined` without
 * conflicting with the guard's stale-result handling.
 *
 * @example
 * const storeStateGuard = createStoreStateGuard(
 *   () => authStore.userId
 * )
 *
 * async function loadDataChanges() {
 *   const currentUserId = authStore.userId;
 *   if (!currentUserId) return;
 *   let apiResult: StoreDataChanges | undefined;
 *
 *   const isCurrentState = await storeStateGuard(
 *     () =>
 *       dataChangesApi
 *         .getTimestamps()
 *         .then(toStoreDto)
 *         .catch((error) => {
 *           console.error("Failed to load data changes:", error);
 *           return undefined;
 *         }),
 *     (apiDataChanges) => {
 *       apiResult = apiDataChanges;
 *     },
 *   );
 *   if (!isCurrentState) return;
 *
 *   if (apiResult !== undefined) {
 *     dataChanges.value = apiResult;
 *     dataChangesStorage.save(currentUserId, apiResult);
 *     return;
 *   }
 *
 *   dataChanges.value = dataChangesStorage.get(currentUserId);
 * }
 */
export function createStoreStateGuard<TState>(
  getState?: () => TState,
) {
  let latestRequestId = 0;

  async function storeStateGuard<TResult>(
    action: () => Promise<TResult>,
    onLatest: (result: TResult) => unknown,
  ): Promise<boolean> {
    const requestId = ++latestRequestId;
    let stateBefore;
    if (getState) {
      stateBefore = getState();
    }

    const result = await action();

    if (
      requestId !== latestRequestId ||
      (getState && !Object.is(stateBefore, getState()))
    ) {
      return false;
    }

    await onLatest(result);
    return true;
  }

  function invalidateState() {
    latestRequestId++;
  }

  return {
    storeStateGuard,
    invalidateState,
  };
}
