import axios from "axios";
import { categoryApi } from "@/services/api/categoryApi";
import { createUserEntryStorage } from "@/utils/localStorage";
import type {
  CustomCategory,
  CustomCategoryCreateDto,
  CustomCategoryPatchDto,
} from "@/types/category";
import type { Operation } from "@/types/operation";

const LOCAL_STORAGE_CUSTOM_CATEGORIES_PENDING_OPERATIONS =
  "finfast-custom-categories-pending-operations";

const LOCAL_STORAGE_SYSTEM_CATEGORIES_PENDING_OPERATIONS =
  "finfast-system-categories-pending-operations";

type CustomCategoryOperation = Operation<
  CustomCategoryCreateDto | CustomCategoryPatchDto
>;

type SystemCategoryOperation = {
  type: "HIDE" | "RESTORE";
  entityId: string;
};

export function createCategorySyncService(userId: string) {
  const customCategoriesPendingStorage = createUserEntryStorage<string>(
    LOCAL_STORAGE_CUSTOM_CATEGORIES_PENDING_OPERATIONS,
    userId,
  );

  const systemCategoriesPendingStorage = createUserEntryStorage<string>(
    LOCAL_STORAGE_SYSTEM_CATEGORIES_PENDING_OPERATIONS,
    userId,
  );

  function isNetworkError(error: unknown): boolean {
    return axios.isAxiosError(error) && !error.response;
  }

  function shouldRetry(error: unknown): boolean {
    if (!axios.isAxiosError(error)) { // if not 4xx | 5xx | timeout | no response
      return false;
    }

    if (!error.response) { // if not response then retry
      return true;
    }

    return error.response.status === 401 ||
          error.response.status >= 500;
}

  // ---------------------------------------------------------------------------
  // Custom categories
  // ---------------------------------------------------------------------------

  function getPendingCustomCategoryOperations(): CustomCategoryOperation[] {
    const value = customCategoriesPendingStorage.get();

    if (!value) {
      return [];
    }

    try {
      return JSON.parse(value);
    } catch {
      console.error("Failed to parse pending custom category operations");
      return [];
    }
  }

  function saveCustomCategoryOperationsToStorage(
    operations: CustomCategoryOperation[],
  ) {
    customCategoriesPendingStorage.save(JSON.stringify(operations));
  }

  function addCustomCategoryPendingOperation(
    operation: CustomCategoryOperation,
  ) {
    const operations = getPendingCustomCategoryOperations();
    operations.push(operation);
    saveCustomCategoryOperationsToStorage(operations);
  }

  async function createCustomCategory(
    dto: CustomCategoryCreateDto,
  ): Promise<CustomCategory | undefined> {
    try {
      return await categoryApi.createCustomCategory(dto);
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      addCustomCategoryPendingOperation({
        type: "CREATE",
        entityId: dto.id,
        dto,
      });

      return undefined;
    }
  }

  async function updateCustomCategory(
    entityId: string,
    dto: CustomCategoryPatchDto,
  ): Promise<CustomCategory | undefined> {
    try {
      return await categoryApi.updateCustomCategory(entityId, dto);
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      addCustomCategoryPendingOperation({
        type: "UPDATE",
        entityId,
        dto,
      });

      return undefined;
    }
  }

  async function deleteCustomCategory(entityId: string): Promise<boolean> {
    try {
      await categoryApi.deleteCustomCategory(entityId);
      return true;
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      addCustomCategoryPendingOperation({
        type: "DELETE",
        entityId,
      });

      return false;
    }
  }

  async function hideCustomCategory(entityId: string): Promise<boolean> {
    try {
      await categoryApi.hideCustomCategory(entityId);
      return true;
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      addCustomCategoryPendingOperation({
        type: "HIDE",
        entityId,
      });

      return false;
    }
  }

  async function restoreCustomCategory(entityId: string): Promise<boolean> {
    try {
      await categoryApi.restoreCustomCategory(entityId);
      return true;
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      addCustomCategoryPendingOperation({
        type: "RESTORE",
        entityId,
      });

      return false;
    }
  }

  async function sendCustomCategoryOperation(
    operation: CustomCategoryOperation,
  ): Promise<boolean> {
    try {
      switch (operation.type) {
        case "CREATE":
          await categoryApi.createCustomCategory(
            operation.dto as CustomCategoryCreateDto,
          );
          return true;

        case "UPDATE":
          await categoryApi.updateCustomCategory(
            operation.entityId,
            operation.dto,
          );
          return true;

        case "DELETE":
          await categoryApi.deleteCustomCategory(operation.entityId);
          return true;

        case "HIDE":
          await categoryApi.hideCustomCategory(operation.entityId);
          return true;

        case "RESTORE":
          await categoryApi.restoreCustomCategory(operation.entityId);
          return true;
      }
    } catch (error) {
      if (shouldRetry(error)) {
        return false;
      }

      // Сервер ответил. Значит, это уже не проблема сети.
      // Операцию убираем из pending.
      console.error(
        "Failed to send pending custom category operation:",
        operation,
        error,
      );

      return true;
    }
  }

  async function sendPendingCustomCategoryOperations() {
    const operations = getPendingCustomCategoryOperations();

    if (operations.length === 0) {
      return;
    }

    const remaining: CustomCategoryOperation[] = [];

    for (const operation of operations) {
      const sent = await sendCustomCategoryOperation(operation);

      if (!sent) {
        remaining.push(operation);
        break;
      }
    }

    saveCustomCategoryOperationsToStorage(remaining);
  }

  // ---------------------------------------------------------------------------
  // System categories
  // ---------------------------------------------------------------------------

  function getSystemCategoryPendingOperations(): SystemCategoryOperation[] {
    const value = systemCategoriesPendingStorage.get();

    if (!value) {
      return [];
    }

    try {
      return JSON.parse(value);
    } catch {
      console.error("Failed to parse pending system category operations");
      return [];
    }
  }

  function saveSystemCategoryOperationsToStorage(
    operations: SystemCategoryOperation[],
  ) {
    systemCategoriesPendingStorage.save(JSON.stringify(operations));
  }

  function addSystemCategoryPendingOperation(
    operation: SystemCategoryOperation,
  ) {
    const operations = getSystemCategoryPendingOperations();
    operations.push(operation);
    saveSystemCategoryOperationsToStorage(operations);
  }

  async function hideSystemCategory(entityId: string): Promise<boolean> {
    try {
      await categoryApi.hideSystemCategory(entityId);
      return true;
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      addSystemCategoryPendingOperation({
        type: "HIDE",
        entityId,
      });

      return false;
    }
  }

  async function restoreSystemCategory(entityId: string): Promise<boolean> {
    try {
      await categoryApi.restoreSystemCategory(entityId);
      return true;
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      addSystemCategoryPendingOperation({
        type: "RESTORE",
        entityId,
      });

      return false;
    }
  }

  async function sendSystemCategoryOperation(
    operation: SystemCategoryOperation,
  ): Promise<boolean> {
    try {
      switch (operation.type) {
        case "HIDE":
          await categoryApi.hideSystemCategory(operation.entityId);
          return true;

        case "RESTORE":
          await categoryApi.restoreSystemCategory(operation.entityId);
          return true;
      }
    } catch (error) {
      if (shouldRetry(error)) {
        return false;
      }

      console.error(
        "Failed to send pending system category operation:",
        operation,
        error,
      );

      return true;
    }
  }

  async function sendPendingSystemCategoryOperations() {
    const operations = getSystemCategoryPendingOperations();

    if (operations.length === 0) {
      return;
    }

    const remaining: SystemCategoryOperation[] = [];

    for (const operation of operations) {
      const sent = await sendSystemCategoryOperation(operation);

      if (!sent) {
        remaining.push(operation);
        break;
      }
    }

    saveSystemCategoryOperationsToStorage(remaining);
  }

  // ---------------------------------------------------------------------------
  // All pending operations
  // ---------------------------------------------------------------------------

  async function sendPendingOperations() {
    await sendPendingCustomCategoryOperations();
    await sendPendingSystemCategoryOperations();
  }

  return {
    createCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    hideCustomCategory,
    restoreCustomCategory,

    hideSystemCategory,
    restoreSystemCategory,

    sendPendingOperations,
  };
}
