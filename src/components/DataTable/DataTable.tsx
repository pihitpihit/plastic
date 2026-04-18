import { DataTableRoot } from "./DataTableRoot";
import { DataTableToolbar } from "./DataTableToolbar";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableHeader } from "./DataTableHeader";
import { DataTableBody } from "./DataTableBody";
import { DataTableRow } from "./DataTableRow";
import { DataTableEmpty } from "./DataTableEmpty";
import { DataTableLoading } from "./DataTableLoading";

type DataTableRootType = typeof DataTableRoot;

export const DataTable = Object.assign(DataTableRoot, {
  Root: DataTableRoot,
  Toolbar: DataTableToolbar,
  Pagination: DataTablePagination,
  Header: DataTableHeader,
  Body: DataTableBody,
  Row: DataTableRow,
  Empty: DataTableEmpty,
  Loading: DataTableLoading,
}) as DataTableRootType & {
  Root: typeof DataTableRoot;
  Toolbar: typeof DataTableToolbar;
  Pagination: typeof DataTablePagination;
  Header: typeof DataTableHeader;
  Body: typeof DataTableBody;
  Row: typeof DataTableRow;
  Empty: typeof DataTableEmpty;
  Loading: typeof DataTableLoading;
};
