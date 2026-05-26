import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@salary-management-system/ui/components/alert-dialog";
import { Badge } from "@salary-management-system/ui/components/badge";
import { Button } from "@salary-management-system/ui/components/button";
import { Input } from "@salary-management-system/ui/components/input";
import { Label } from "@salary-management-system/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@salary-management-system/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@salary-management-system/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import { Combobox } from "@/components/combobox";
import { EmployeeForm } from "@/components/employee-form";
import { authClient } from "@/lib/auth-client";
import { formatMoney } from "@/lib/money";
import type { Employee, EmploymentType, SortOption } from "@/lib/types";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/employees")({
  component: EmployeesPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

const PAGE_SIZE = 25;

const sortLabels: Record<SortOption, string> = {
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
  salary_asc: "Salary low–high",
  salary_desc: "Salary high–low",
};

const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

const RIGHT_ALIGNED_COLUMNS = new Set(["salary"]);

function cellAlignClass(columnId: string): string {
  return RIGHT_ALIGNED_COLUMNS.has(columnId) ? "text-right tabular-nums" : "";
}

function EmployeesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [country, setCountry] = useState<string | undefined>();
  const [jobTitle, setJobTitle] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name_asc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | undefined>();
  const [deleting, setDeleting] = useState<Employee | undefined>();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orpc.employees.key() });
    queryClient.invalidateQueries({ queryKey: orpc.insights.key() });
  };

  const listQuery = useQuery(
    orpc.employees.list.queryOptions({
      input: {
        page,
        pageSize: PAGE_SIZE,
        country,
        jobTitle,
        search: search || undefined,
        sort,
      },
    })
  );

  const countriesQuery = useQuery(orpc.insights.salaryByCountry.queryOptions());
  const jobTitlesQuery = useQuery(
    orpc.insights.topJobTitles.queryOptions({ input: { limit: 50 } })
  );

  const deleteMutation = useMutation(
    orpc.employees.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Employee deleted");
        invalidate();
        setDeleting(undefined);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
      },
      { accessorKey: "jobTitle", header: "Job title" },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ getValue }) =>
          getValue<string | null>() ?? (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { accessorKey: "countryCode", header: "Country" },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="secondary">
            {employmentTypeLabels[row.original.employmentType]}
          </Badge>
        ),
      },
      {
        id: "salary",
        header: "Salary",
        cell: ({ row }) =>
          formatMoney(row.original.salary, row.original.currency),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              aria-label={`Edit ${row.original.firstName} ${row.original.lastName}`}
              onClick={() => {
                setEditing(row.original);
                setFormOpen(true);
              }}
              size="icon-sm"
              variant="ghost"
            >
              <PencilIcon aria-hidden="true" />
            </Button>
            <Button
              aria-label={`Delete ${row.original.firstName} ${row.original.lastName}`}
              onClick={() => setDeleting(row.original)}
              size="icon-sm"
              variant="ghost"
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const rows = listQuery.data?.rows ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
  });

  const onFilterChange = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  let body: ReactNode;
  if (listQuery.isLoading) {
    body = (
      <TableRow>
        <TableCell className="text-muted-foreground" colSpan={columns.length}>
          Loading…
        </TableCell>
      </TableRow>
    );
  } else if (rows.length === 0) {
    body = (
      <TableRow>
        <TableCell className="text-muted-foreground" colSpan={columns.length}>
          No employees match these filters.
        </TableCell>
      </TableRow>
    );
  } else {
    body = table.getRowModel().rows.map((row) => (
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => (
          <TableCell className={cellAlignClass(cell.column.id)} key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="font-semibold text-xl tracking-tight">Employees</h1>
          <p className="text-muted-foreground text-sm">
            Search, filter, and manage your organization's roster.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          Add employee
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 border bg-muted/20 p-3">
        <div className="space-y-1.5">
          <Label htmlFor="employee-search">Search name</Label>
          <Input
            autoComplete="off"
            className="w-52"
            id="employee-search"
            onChange={(e) => onFilterChange(setSearch, e.target.value)}
            placeholder="Search by name…"
            spellCheck={false}
            type="search"
            value={search}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Combobox
            allLabel="All countries"
            onChange={(value) => onFilterChange(setCountry, value)}
            options={(countriesQuery.data ?? []).map((r) => r.country)}
            placeholder="All countries"
            value={country}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Job title</Label>
          <Combobox
            allLabel="All job titles"
            onChange={(value) => onFilterChange(setJobTitle, value)}
            options={(jobTitlesQuery.data ?? []).map((r) => r.jobTitle)}
            placeholder="All job titles"
            value={jobTitle}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sort</Label>
          <Select
            items={sortLabels}
            onValueChange={(value) =>
              onFilterChange(setSort, value as SortOption)
            }
            value={sort}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-none border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow className="bg-muted/50" key={group.id}>
                {group.headers.map((head) => (
                  <TableHead
                    className={cellAlignClass(head.column.id)}
                    key={head.id}
                  >
                    {head.isPlaceholder
                      ? null
                      : flexRender(
                          head.column.columnDef.header,
                          head.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>{body}</TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm tabular-nums">
          Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{" "}
          {total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <Button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            size="sm"
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-sm tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            size="sm"
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>

      <EmployeeForm
        employee={editing}
        key={editing?.id ?? "new"}
        onOpenChange={setFormOpen}
        open={formOpen}
      />

      <AlertDialog
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(undefined);
          }
        }}
        open={Boolean(deleting)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleting?.firstName}{" "}
              {deleting?.lastName}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleting) {
                  deleteMutation.mutate({ id: deleting.id });
                }
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
