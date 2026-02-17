// src/App/Dashboard/index.tsx
import * as React from "react"

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type {
  ColumnDef,
  CellContext,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AttendanceStatus = "present" | "absent"

type Employee = {
  id: string
  name: string
  department: string
  role: string
  status: AttendanceStatus
  lastSeen: string
}

// Replace with your real data (API, store, props, etc.)
const EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    name: "Alex Reyes",
    department: "Operations",
    role: "Supervisor",
    status: "present",
    lastSeen: "2026-02-17 08:12",
  },
  {
    id: "EMP-002",
    name: "Bianca Santos",
    department: "HR",
    role: "Coordinator",
    status: "absent",
    lastSeen: "2026-02-16 17:40",
  },
  {
    id: "EMP-003",
    name: "Carlo Dela Cruz",
    department: "Engineering",
    role: "Developer",
    status: "present",
    lastSeen: "2026-02-17 08:31",
  },
  {
    id: "EMP-004",
    name: "Diane Flores",
    department: "Finance",
    role: "Analyst",
    status: "present",
    lastSeen: "2026-02-17 08:05",
  },
  {
    id: "EMP-005",
    name: "Enzo Bautista",
    department: "Engineering",
    role: "QA Engineer",
    status: "absent",
    lastSeen: "2026-02-15 18:12",
  },
  {
    id: "EMP-006",
    name: "Faye Lim",
    department: "Operations",
    role: "Dispatcher",
    status: "present",
    lastSeen: "2026-02-17 08:28",
  },
]

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

function parseLastSeen(v: string) {
  const [datePart, timePart] = v.split(" ")
  const [y, m, d] = datePart.split("-").map(Number)
  const [hh, mm] = (timePart ?? "00:00").split(":").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
}

function formatLastSeenPretty(v: string) {
  const dt = parseLastSeen(v)
  if (Number.isNaN(dt.getTime())) return v
  const date = dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
  const time = dt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${date} • ${time}`
}

function StatusPill({ status }: { status: AttendanceStatus }) {
  const isPresent = status === "present"
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        isPresent
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
      )}
    >
      <span
        className={cx(
          "mr-1 inline-block h-1.5 w-1.5 rounded-full",
          isPresent ? "bg-emerald-500" : "bg-rose-500"
        )}
      />
      {isPresent ? "Present" : "Absent"}
    </span>
  )
}

const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: "id",
    header: "Employee ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("id") as string}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      const dept = row.getValue("department") as string
      return (
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{dept}</span>
        </div>
      )
    },
  },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "role", header: "Role" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: CellContext<Employee, unknown>) => {
      const v = row.getValue("status") as AttendanceStatus
      return <StatusPill status={v} />
    },
  },
  {
    accessorKey: "lastSeen",
    header: "Last Seen",
    cell: ({ row }) => (
      <span className="text-sm">
        {formatLastSeenPretty(row.getValue("lastSeen") as string)}
      </span>
    ),
  },
]

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value: number | string
  hint?: string
}) {
  return (
    <Card className="rounded-2xl border bg-card/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  )
}

function DataTable({ data }: { data: Employee[] }) {
  const [globalFilter, setGlobalFilter] = React.useState<string>("")
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "name", desc: false },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )

  // Local UI filters (simple + user friendly)
  const [statusFilter, setStatusFilter] = React.useState<"all" | AttendanceStatus>(
    "all"
  )
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all")

  const departments = React.useMemo(() => {
    const set = new Set(data.map((d) => d.department))
    return ["all", ...Array.from(set).sort()]
  }, [data])

  const filteredData = React.useMemo(() => {
    const q = globalFilter.trim().toLowerCase()

    return data.filter((e) => {
      const byStatus = statusFilter === "all" ? true : e.status === statusFilter
      const byDept =
        departmentFilter === "all" ? true : e.department === departmentFilter

      const bySearch =
        q.length === 0
          ? true
          : `${e.id} ${e.name} ${e.department} ${e.role} ${e.status} ${e.lastSeen}`
              .toLowerCase()
              .includes(q)

      return byStatus && byDept && bySearch
    })
  }, [data, globalFilter, statusFilter, departmentFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      sorting,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 7 },
    },
  })

  const clearAll = () => {
    setGlobalFilter("")
    setStatusFilter("all")
    setDepartmentFilter("all")
    setSorting([{ id: "name", desc: false }])
    table.setPageIndex(0)
  }

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder="Search by name, ID, department, role..."
            value={globalFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setGlobalFilter(e.target.value)
            }
            className="md:max-w-sm"
          />

          <div className="flex gap-2">
            <div className="w-[160px]">
              <label className="mb-1 block text-xs text-muted-foreground">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatusFilter(e.target.value as "all" | AttendanceStatus)
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div className="w-[190px]">
              <label className="mb-1 block text-xs text-muted-foreground">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setDepartmentFilter(e.target.value)
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === "all" ? "All departments" : d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearAll}>
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="space-y-1">
                      <div className="font-medium">No results</div>
                      <div className="text-sm text-muted-foreground">
                        Try another search or reset filters.
                      </div>
                      <Button variant="outline" size="sm" onClick={clearAll} className="mt-2">
                        Reset filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 border-t p-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <div>
            Showing {table.getRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} result(s)
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Employees() {
  const totalEmployees = EMPLOYEES.length
  const totalPresent = EMPLOYEES.filter((e) => e.status === "present").length
  const totalAbsent = EMPLOYEES.filter((e) => e.status === "absent").length

  const presentRate =
    totalEmployees === 0 ? 0 : Math.round((totalPresent / totalEmployees) * 100)

  const latestSeen = React.useMemo(() => {
    if (!EMPLOYEES.length) return null
    return EMPLOYEES.reduce((acc, cur) => {
      const a = parseLastSeen(acc.lastSeen)
      const b = parseLastSeen(cur.lastSeen)
      return b > a ? cur : acc
    }, EMPLOYEES[0])
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Attendance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Search and filter employees quickly. Simple and user-friendly.
          </p>
        </div>

        {latestSeen ? (
          <div className="rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground">
            Latest check:{" "}
            <span className="font-medium text-foreground">{latestSeen.name}</span>{" "}
            • {formatLastSeenPretty(latestSeen.lastSeen)}
          </div>
        ) : null}
      </div>

      {/* Top cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Employees" value={totalEmployees} hint="Registered in the system" />
        <StatCard title="Present Today" value={totalPresent} hint={`${presentRate}% attendance rate`} />
        <StatCard title="Absent Today" value={totalAbsent} hint="Needs follow-up" />
        <StatCard
          title="Departments"
          value={new Set(EMPLOYEES.map((e) => e.department)).size}
          hint="Across the organization"
        />
      </div>

      {/* Table */}
      <Card className="rounded-2xl border bg-card/60 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle>Employees</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filter by status and department, or search across all fields.
          </p>
        </CardHeader>
        <CardContent>
          <DataTable data={EMPLOYEES} />
        </CardContent>
      </Card>
    </div>
  )
}
