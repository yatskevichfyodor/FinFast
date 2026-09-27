const LOCAL_STORAGE_CUSTOM_CATEGORIES_KEY = "finfast-system-hidden-categories"

const getKey = (userId: string) => `${LOCAL_STORAGE_CUSTOM_CATEGORIES_KEY}:${userId}`;

export default {
  get(userId: string): string[] {
    const customCategoriesString = localStorage.getItem(getKey(userId));
    if (!customCategoriesString) return [];
    return customCategoriesString.split(",")
  },

  save(userId: string, categoriesIds: string[]) {
    localStorage.setItem(getKey(userId), categoriesIds ? categoriesIds.join(",") : "");
  }
}