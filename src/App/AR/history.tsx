// src/App/AR/history.tsx
import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { ColumnDef, SortingState } from "@tanstack/react-table"

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

import * as XLSX from "xlsx"

type TaskStatus = "running" | "finished"
type ApprovalStatus = "pending" | "approved" | "rejected"

type TaskEntry = {
  id: string
  module: string
  task: string
  notes: string
  startedAt: string // ISO
  finishedAt: string | null // ISO
  status: TaskStatus
}

type ARHistoryEntry = {
  id: string
  dayKey: string // YYYY-MM-DD (local)
  submittedAt: string // ISO
  tasks: TaskEntry[]
  approver: string
  approvalStatus: ApprovalStatus
}

const HISTORY_KEY = "hris:ar:history"

function fmt(dtIso: string | null) {
  if (!dtIso) return "-"
  const dt = new Date(dtIso)
  if (Number.isNaN(dt.getTime())) return dtIso
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function durationMs(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.max(0, end - start)
}

function durationLabel(startIso: string, endIso: string | null) {
  const total = durationMs(startIso, endIso)
  const sec = Math.floor(total / 1000)
  const hh = Math.floor(sec / 3600)
  const mm = Math.floor((sec % 3600) / 60)
  const ss = sec % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

function totalDurationLabel(tasks: TaskEntry[]) {
  const total = tasks.reduce(
    (acc: number, t: TaskEntry) => acc + durationMs(t.startedAt, t.finishedAt),
    0
  )
  const sec = Math.floor(total / 1000)
  const hh = Math.floor(sec / 3600)
  const mm = Math.floor((sec % 3600) / 60)
  const ss = sec % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

/**
 * Backward compatible:
 * if old history items don't have approver/approvalStatus, we default them.
 */
function normalizeHistory(raw: unknown): ARHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map((h: any) => {
    const approver =
      typeof h?.approver === "string" && h.approver.trim() ? h.approver : "-"
    const approvalStatus: ApprovalStatus =
      h?.approvalStatus === "approved" || h?.approvalStatus === "rejected"
        ? h.approvalStatus
        : "pending"

    return {
      id: String(h?.id ?? ""),
      dayKey: String(h?.dayKey ?? ""),
      submittedAt: String(h?.submittedAt ?? ""),
      tasks: Array.isArray(h?.tasks) ? (h.tasks as TaskEntry[]) : [],
      approver,
      approvalStatus,
    } satisfies ARHistoryEntry
  })
}

function readHistory(): ARHistoryEntry[] {
  const raw = localStorage.getItem(HISTORY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return normalizeHistory(parsed)
  } catch {
    return []
  }
}

function exportAllHistoryToExcel(history: ARHistoryEntry[]) {
  const rows = history.flatMap((day) =>
    day.tasks.map((t) => ({
      Day: day.dayKey,
      Submitted: fmt(day.submittedAt),
      Approver: day.approver,
      "Approval Status": day.approvalStatus,
      Module: t.module,
      Task: t.task,
      Notes: t.notes,
      Status: t.status,
      "Start Time": fmt(t.startedAt),
      "Finish Time": fmt(t.finishedAt),
      Duration: durationLabel(t.startedAt, t.finishedAt),
    }))
  )

  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "No history yet" }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "AR History")

  const filename = `AR_History_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}

/** Per-day tasks table */
const taskColumns: ColumnDef<TaskEntry>[] = [
  {
    accessorKey: "module",
    header: "Module",
    cell: ({ row }) => <span className="text-sm">{row.original.module || "-"}</span>,
  },
  {
    accessorKey: "task",
    header: "Task",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.task}</span>
        {row.original.notes?.trim() ? (
          <span className="text-xs text-muted-foreground line-clamp-1">
            {row.original.notes}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground capitalize">
        {row.original.status}
      </span>
    ),
  },
  {
    id: "start",
    header: "Start",
    cell: ({ row }) => <span className="text-sm">{fmt(row.original.startedAt)}</span>,
  },
  {
    id: "finish",
    header: "Finish",
    cell: ({ row }) => <span className="text-sm">{fmt(row.original.finishedAt)}</span>,
  },
  {
    id: "duration",
    header: "Duration",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {durationLabel(row.original.startedAt, row.original.finishedAt)}
      </span>
    ),
    sortingFn: (a, b) => {
      const aMs = durationMs(a.original.startedAt, a.original.finishedAt)
      const bMs = durationMs(b.original.startedAt, b.original.finishedAt)
      return aMs - bMs
    },
  },
]

function TasksReadOnlyTable({ tasks }: { tasks: TaskEntry[] }) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "start", desc: false },
  ])

  const table = useReactTable({
    data: tasks,
    columns: taskColumns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "").toLowerCase()
      if (!q) return true
      const v = `${row.original.module} ${row.original.task} ${row.original.notes} ${row.original.status}`.toLowerCase()
      return v.includes(q)
    },
    initialState: { pagination: { pageSize: 7 } },
  })

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search tasks..."
        value={globalFilter}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setGlobalFilter(e.target.value)
        }
        className="md:max-w-sm"
      />

      <div className="rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className="whitespace-nowrap">
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={999} className="h-24 text-center">
                    No tasks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2 border-t p-3 text-sm text-muted-foreground">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>

          <div className="ml-auto flex items-center gap-2">
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
      </div>
    </div>
  )
}

export default function ARHistory() {
  const [history, setHistory] = React.useState<ARHistoryEntry[]>(() => readHistory())
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setHistory(readHistory())
  }, [])

  const selected = history.find((h) => h.id === selectedId) ?? null

  const historyColumns: ColumnDef<ARHistoryEntry>[] = [
  {
    accessorKey: "dayKey",
    header: "Day",
    cell: ({ row }) => <span className="font-medium">{row.original.dayKey}</span>,
  },
  {
    id: "submittedAt",
    header: "Submitted",
    cell: ({ row }) => <span className="text-sm">{fmt(row.original.submittedAt)}</span>,
  },
  {
    id: "counts",
    header: "Tasks",
    cell: ({ row }) => {
      const total = row.original.tasks.length
      const finished = row.original.tasks.filter(
        (t: TaskEntry) => t.status === "finished"
      ).length
      const running = total - finished
      return (
        <span className="text-sm text-muted-foreground">
          {total} total • {finished} finished • {running} running
        </span>
      )
    },
  },

  // ✅ moved here: after Tasks column
  {
    accessorKey: "approver",
    header: "Approver",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.approver?.trim() ? row.original.approver : "-"}
      </span>
    ),
  },
  {
    accessorKey: "approvalStatus",
    header: "Status",
    cell: ({ row }) => (
      <span className="text-sm capitalize text-muted-foreground">
        {row.original.approvalStatus}
      </span>
    ),
  },

  {
    id: "totalTime",
    header: "Total Time",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {totalDurationLabel(row.original.tasks)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <Button size="sm" onClick={() => setSelectedId(row.original.id)}>
        View
      </Button>
    ),
  },
]


  const [globalFilter, setGlobalFilter] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "submittedAt", desc: true },
  ])

  const table = useReactTable({
    data: history,
    columns: historyColumns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "").toLowerCase()
      if (!q) return true
      const v =
        `${row.original.dayKey} ${row.original.submittedAt} ${row.original.approver} ${row.original.approvalStatus}`.toLowerCase()
      return v.includes(q)
    },
    initialState: { pagination: { pageSize: 7 } },
  })

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AR History</h1>
        <p className="text-sm text-muted-foreground">
          This list shows all history entries. Click View to open the tasks for that day.
        </p>
      </div>

      {/* HISTORY LIST */}
      <Card className="w-full rounded-2xl border bg-card/60 shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>History List</CardTitle>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAllHistoryToExcel(history)}
              disabled={!history.length}
            >
              Export Excel
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search by day, approver, status..."
              value={globalFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setGlobalFilter(e.target.value)
              }
              className="md:max-w-sm"
            />
            <div className="flex items-center gap-2">
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

          <div className="mt-4 rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead key={h.id} className="whitespace-nowrap">
                          {h.isPlaceholder
                            ? null
                            : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={999} className="h-24 text-center">
                        No history yet. Go to AR Task page and click “Submit Day”.
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
        </CardContent>
      </Card>

      {/* VIEW (SAME WIDTH AS HISTORY LIST) */}
      {selected ? (
        <Card className="w-full rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Tasks for {selected.dayKey}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Submitted at {fmt(selected.submittedAt)} • Total time{" "}
                  {totalDurationLabel(selected.tasks)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Approver:{" "}
                  <span className="font-medium text-foreground">{selected.approver}</span>{" "}
                  • Status:{" "}
                  <span className="font-medium text-foreground capitalize">
                    {selected.approvalStatus}
                  </span>
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedId(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <TasksReadOnlyTable tasks={selected.tasks} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
