/**
 * @param key - local storage key prefix, actual key will be ${key}:${userId}
 * @returns storage object
 * 
 * @example
 * const categoriesSyncStateStorage = createUserEntryStorage<boolean>("finfast-is-categories-synced");
 * ...
 * categoriesSyncStateStorage.save(true);
 * ...
 * categoriesSyncStateStorage.get() ?? false
 */
export function createUserEntryStorage<T>(key: string, userId: string) {
  const localStorageKey = `${key}:${userId}`;

  function get(): T | undefined {
    const data = localStorage.getItem(localStorageKey)
    return data ? JSON.parse(data) : undefined
  }

  function save(dataChanges: T): void {
    localStorage.setItem(localStorageKey, JSON.stringify(dataChanges))
  }

  return {
    get, 
    save
  }
}