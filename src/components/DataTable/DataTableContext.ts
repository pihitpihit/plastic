import { createContext, useContext } from "react";
import type { DataTableContextValue } from "./DataTable.types";

export const DataTableContext =
  createContext<DataTableContextValue<unknown> | null>(null);

export function useDataTableContext<T = unknown>(): DataTableContextValue<T> {
  const ctx = useContext(DataTableContext);
  if (ctx === null) {
    throw new Error(
      "DataTable compound components must be used within <DataTable>",
    );
  }
  return ctx as DataTableContextValue<T>;
}
