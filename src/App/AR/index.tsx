// src/App/AcknowledgementReceipt/index.tsx
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

type TaskStatus = "running" | "finished"

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
}

const TASKS_KEY = "hris:ar:tasks"
const HISTORY_KEY = "hris:ar:history"

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

function uid(prefix = "ID") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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

function toDayKeyLocal(dtIso: string) {
  const dt = new Date(dtIso)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, "0")
  const d = String(dt.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function durationLabel(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end)) return "-"
  const sec = Math.max(0, Math.floor((end - start) / 1000))
  const hh = Math.floor(sec / 3600)
  const mm = Math.floor((sec % 3600) / 60)
  const ss = sec % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

function StatusPill({ status }: { status: TaskStatus }) {
  const running = status === "running"
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        running
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
      )}
    >
      <span
        className={cx(
          "mr-1 inline-block h-1.5 w-1.5 rounded-full",
          running ? "bg-amber-500" : "bg-emerald-500"
        )}
      />
      {running ? "Running" : "Finished"}
    </span>
  )
}

const columns: ColumnDef<TaskEntry>[] = [
  {
    accessorKey: "module",
    header: "Module",
    cell: ({ row }) => (
      <span className="text-sm">{(row.getValue("module") as string) || "-"}</span>
    ),
  },
  {
    accessorKey: "task",
    header: "Task",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue("task") as string}</span>
        {(row.original.notes || "").trim() ? (
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
    cell: ({ row }) => <StatusPill status={row.getValue("status") as TaskStatus} />,
  },
  {
    id: "startedAt",
    header: "Start",
    cell: ({ row }) => <span className="text-sm">{fmt(row.original.startedAt)}</span>,
  },
  {
    id: "finishedAt",
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
      const aStart = new Date(a.original.startedAt).getTime()
      const aEnd = a.original.finishedAt
        ? new Date(a.original.finishedAt).getTime()
        : Date.now()
      const bStart = new Date(b.original.startedAt).getTime()
      const bEnd = b.original.finishedAt
        ? new Date(b.original.finishedAt).getTime()
        : Date.now()
      const aDur = Math.max(0, aEnd - aStart)
      const bDur = Math.max(0, bEnd - bStart)
      return aDur - bDur
    },
  },
]

function TasksTable({
  data,
  onFinish,
  onDelete,
}: {
  data: TaskEntry[]
  onFinish: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [globalFilter, setGlobalFilter] = React.useState<string>("")
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "startedAt", desc: true },
  ])

  const table = useReactTable({
    data,
    columns: [
      ...columns,
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const isRunning = row.original.status === "running"
          return (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onFinish(row.original.id)}
                disabled={!isRunning}
              >
                Finish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onDelete(row.original.id)}
              >
                Delete
              </Button>
            </div>
          )
        },
      } satisfies ColumnDef<TaskEntry>,
    ],
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
        `${row.original.module} ${row.original.task} ${row.original.notes} ${row.original.status}`.toLowerCase()
      return v.includes(q)
    },
    initialState: { pagination: { pageSize: 7 } },
  })

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search tasks (module, task, notes)..."
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
                    <div className="space-y-1">
                      <div className="font-medium">No tasks yet</div>
                      <div className="text-sm text-muted-foreground">
                        Add a task above, then click Start Task.
                      </div>
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

function readHistory(): ARHistoryEntry[] {
  const raw = localStorage.getItem(HISTORY_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as ARHistoryEntry[]
  } catch {
    return []
  }
}

function writeHistory(entries: ARHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
}

export default function AcknowledgementReceiptTasks() {
  const [module, setModule] = React.useState("")
  const [task, setTask] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(
    null
  )

  const [tasks, setTasks] = React.useState<TaskEntry[]>(() => {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as TaskEntry[]
    } catch {
      return []
    }
  })

  // live timer re-render for duration on running rows
  const [, force] = React.useState(0)
  React.useEffect(() => {
    const anyRunning = tasks.some((t) => t.status === "running")
    if (!anyRunning) return
    const id = window.setInterval(() => force((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [tasks])

  React.useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  }, [tasks])

  const startTask = () => {
    setMsg(null)
    const t = task.trim()
    if (!t) return

    const entry: TaskEntry = {
      id: uid("TASK"),
      module: module.trim(),
      task: t,
      notes: notes.trim(),
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: "running",
    }

    setTasks((prev) => [entry, ...prev])
    setTask("")
    setNotes("")
  }

  const finishTask = (id: string) => {
    setMsg(null)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id && t.status === "running"
          ? { ...t, status: "finished", finishedAt: new Date().toISOString() }
          : t
      )
    )
  }

  const deleteTask = (id: string) => {
    setMsg(null)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const clearAll = () => {
    setMsg(null)
    setTasks([])
    localStorage.removeItem(TASKS_KEY)
  }

  const submitDayToHistory = () => {
    setMsg(null)

    const now = new Date().toISOString()
    const dayKey = toDayKeyLocal(now)

    // 1) auto-finish any running tasks (so end time is recorded)
    const finalizedTasks: TaskEntry[] = tasks
      .filter((t) => toDayKeyLocal(t.startedAt) === dayKey)
      .map((t) =>
        t.status === "running"
          ? { ...t, status: "finished", finishedAt: now }
          : { ...t }
      )

    if (finalizedTasks.length === 0) {
      setMsg({ type: "err", text: "No tasks for today to submit." })
      return
    }

    // 2) save into history (upsert by dayKey)
    const history = readHistory()
    const existingIndex = history.findIndex((h) => h.dayKey === dayKey)

    const entry: ARHistoryEntry = {
      id: existingIndex >= 0 ? history[existingIndex].id : uid("ARH"),
      dayKey,
      submittedAt: now,
      tasks: finalizedTasks,
    }

    const nextHistory =
      existingIndex >= 0
        ? history.map((h, i) => (i === existingIndex ? entry : h))
        : [entry, ...history]

    writeHistory(nextHistory)

    // 3) also update current tasks state for today (so table shows finished)
    setTasks((prev) =>
      prev.map((t) =>
        toDayKeyLocal(t.startedAt) === dayKey && t.status === "running"
          ? { ...t, status: "finished", finishedAt: now }
          : t
      )
    )

    setMsg({ type: "ok", text: `Submitted ${dayKey} to AR History.` })
  }

  const runningCount = tasks.filter((t) => t.status === "running").length
  const finishedCount = tasks.filter((t) => t.status === "finished").length

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Acknowledgement Receipt (Tasks)
        </h1>
        <p className="text-sm text-muted-foreground">
          Add a task, start it (records start time), then finish it (records end time). Submit day
          to save in History.
        </p>
      </div>

      {msg ? (
        <div
          className={cx(
            "rounded-lg border p-3 text-sm",
            msg.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
          )}
        >
          {msg.text}
        </div>
      ) : null}

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{runningCount}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Finished</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{finishedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add task */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Add Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Module / Area</label>
              <Input
                value={module}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setModule(e.target.value)
                }
                placeholder="e.g., Finance / Taxes"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm text-muted-foreground">Task *</label>
              <Input
                value={task}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTask(e.target.value)
                }
                placeholder="e.g., Compute withholding tax for payroll"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(e.target.value)
              }
              placeholder="Optional: progress, blockers, handover notes..."
              className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-muted-foreground">
              End of shift? Click “Submit Day” to save today’s tasks into AR History.
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearAll}
                disabled={!tasks.length}
              >
                Clear All
              </Button>

              <Button type="button" onClick={startTask} disabled={!task.trim()}>
                Start Task
              </Button>

              <Button
                type="button"
                onClick={submitDayToHistory}
                disabled={!tasks.length}
              >
                Submit Day
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card className="rounded-2xl border bg-card/60 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle>Task Log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Finish</span> to record end time.
          </p>
        </CardHeader>
        <CardContent>
          <TasksTable data={tasks} onFinish={finishTask} onDelete={deleteTask} />
        </CardContent>
      </Card>
    </div>
  )
}
