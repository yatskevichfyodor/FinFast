export type Operation<T> =
  | {
      type: "CREATE" | "UPDATE";
      entityId: string;
      dto: T;
    }
  | {
      type: "DELETE" | "HIDE" | "RESTORE";
      entityId: string;
    };
