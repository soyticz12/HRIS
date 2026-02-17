// src/App/Settings.tsx
import * as React from "react"

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
type TaskStatus = "running" | "finished"
type ApprovalStatus = "pending" | "approved" | "rejected"

type Employee = {
  id: string
  name: string
  department: string
  role: string
  status: AttendanceStatus
  lastSeen: string
  // IMPORTANT: used to match AR history
  email?: string
}

type TaskEntry = {
  id: string
  module: string
  task: string
  notes: string
  startedAt: string
  finishedAt: string | null
  status: TaskStatus
}

type ARHistoryEntry = {
  id: string
  dayKey: string
  submittedAt: string
  tasks: TaskEntry[]
  approver?: string
  approvalStatus?: ApprovalStatus
  // If you later store employee id/email here, it will filter properly:
  employeeId?: string
  employeeEmail?: string
  employeeName?: string
}

const AR_HISTORY_KEY = "hris:ar:history"

// Demo employees (replace with API/store)
const EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    name: "Alex Reyes",
    department: "Operations",
    role: "Supervisor",
    status: "present",
    lastSeen: "2026-02-17 08:12",
    email: "alex@company.com",
  },
  {
    id: "EMP-002",
    name: "Bianca Santos",
    department: "HR",
    role: "Coordinator",
    status: "absent",
    lastSeen: "2026-02-16 17:40",
    email: "bianca@company.com",
  },
  {
    id: "EMP-003",
    name: "Carlo Dela Cruz",
    department: "Engineering",
    role: "Developer",
    status: "present",
    lastSeen: "2026-02-17 08:31",
    email: "carlo@company.com",
  },
]

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
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

function parseMaybeDateTime(v: string) {
  // handles ISO and "YYYY-MM-DD HH:mm"
  const iso = v.includes("T") ? v : v.replace(" ", "T")
  const dt = new Date(iso)
  return dt
}

function fmtLastSeen(v: string) {
  const dt = parseMaybeDateTime(v)
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

function totalDurationLabel(tasks: TaskEntry[]) {
  const totalMs = tasks.reduce((acc: number, t: TaskEntry) => {
    const start = new Date(t.startedAt).getTime()
    const end = t.finishedAt ? new Date(t.finishedAt).getTime() : Date.now()
    if (Number.isNaN(start) || Number.isNaN(end)) return acc
    return acc + Math.max(0, end - start)
  }, 0)

  const sec = Math.floor(totalMs / 1000)
  const hh = Math.floor(sec / 3600)
  const mm = Math.floor((sec % 3600) / 60)
  const ss = sec % 60
  const pad = (n: number) => String(n).padStart(2, "0")

  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}


function StatusPill({ status }: { status: AttendanceStatus }) {
  const present = status === "present"
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        present
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
      )}
    >
      <span
        className={cx(
          "mr-1 inline-block h-1.5 w-1.5 rounded-full",
          present ? "bg-emerald-500" : "bg-rose-500"
        )}
      />
      {present ? "Present" : "Absent"}
    </span>
  )
}

/**
 * Reads AR history from localStorage.
 * NOTE: To truly show per-employee AR, you should store employeeId/email inside history entries when submitting day.
 * For now, we try to match by employeeId/email/name if present.
 */
function readARHistory(): ARHistoryEntry[] {
  const raw = localStorage.getItem(AR_HISTORY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as ARHistoryEntry[]
  } catch {
    return []
  }
}

function filterARForEmployee(history: ARHistoryEntry[], emp: Employee) {
  // Best case: history entries include employeeId / employeeEmail
  const byId = history.filter((h) => h.employeeId && h.employeeId === emp.id)
  if (byId.length) return byId

  const byEmail =
    emp.email?.trim() ?
      history.filter((h) => h.employeeEmail && h.employeeEmail === emp.email) :
      []

  if (byEmail.length) return byEmail

  // fallback: match name if stored
  const byName = history.filter(
    (h) => h.employeeName && h.employeeName.toLowerCase() === emp.name.toLowerCase()
  )
  if (byName.length) return byName

  // fallback (not reliable): return ALL history (so the modal isn't empty)
  return history
}

function ModalShell({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      {/* Panel */}
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="space-y-1">
            <div className="text-base font-semibold">{title}</div>
            {description ? (
              <div className="text-sm text-muted-foreground">{description}</div>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export default function Attendance() {
  const [q, setQ] = React.useState("")
  const [selected, setSelected] = React.useState<Employee | null>(null)

  const history = React.useMemo(() => readARHistory(), [])
  const filteredEmployees = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return EMPLOYEES
    return EMPLOYEES.filter((e) =>
      `${e.id} ${e.name} ${e.department} ${e.role} ${e.status}`.toLowerCase().includes(s)
    )
  }, [q])

  const arForSelected = React.useMemo(() => {
    if (!selected) return []
    return filterARForEmployee(history, selected)
      .slice()
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }, [history, selected])

  const totalEmployees = EMPLOYEES.length
  const present = EMPLOYEES.filter((e) => e.status === "present").length
  const absent = EMPLOYEES.filter((e) => e.status === "absent").length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            View employee attendance and open their AR logs.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{present}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{absent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance table */}
      <Card className="rounded-2xl border bg-card/60 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle>Employees</CardTitle>
          <div className="text-sm text-muted-foreground">
            Search and click View to open the employee’s AR history.
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            placeholder="Search employee (name, ID, dept, role)..."
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            className="md:max-w-sm"
          />

          <div className="rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Employee</TableHead>
                    <TableHead className="whitespace-nowrap">Role</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Last Seen</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredEmployees.length ? (
                    filteredEmployees.map((e) => (
                      <TableRow key={e.id} className="hover:bg-muted/50">
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium">{e.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {e.id} • {e.department}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-sm">{e.role}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusPill status={e.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-sm">{fmtLastSeen(e.lastSeen)}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button size="sm" onClick={() => setSelected(e)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal: AR for employee */}
      <ModalShell
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `AR History — ${selected.name}` : "AR History"}
        description={
          selected
            ? `Employee ID: ${selected.id} • Department: ${selected.department} • Role: ${selected.role}`
            : undefined
        }
      >
        {selected ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Showing AR entries found in history. (Tip: to make this truly per employee,
              save employeeId/email in AR submit.)
            </div>

            {/* AR list */}
            <div className="rounded-2xl border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Day</TableHead>
                      <TableHead className="whitespace-nowrap">Submitted</TableHead>
                      <TableHead className="whitespace-nowrap">Approver</TableHead>
                      <TableHead className="whitespace-nowrap">Approval</TableHead>
                      <TableHead className="whitespace-nowrap">Tasks</TableHead>
                      <TableHead className="whitespace-nowrap">Total Time</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {arForSelected.length ? (
                      arForSelected.map((day) => {
                        const finished = day.tasks.filter((t) => t.status === "finished").length
                        const running = day.tasks.length - finished
                        return (
                          <TableRow key={day.id} className="hover:bg-muted/50">
                            <TableCell className="whitespace-nowrap">
                              <span className="font-medium">{day.dayKey}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="text-sm">{fmt(day.submittedAt)}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="text-sm">{day.approver ?? "-"}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="text-sm capitalize text-muted-foreground">
                                {day.approvalStatus ?? "pending"}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="text-sm text-muted-foreground">
                                {day.tasks.length} total • {finished} finished • {running} running
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="font-mono text-xs text-muted-foreground">
                                {totalDurationLabel(day.tasks)}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No AR history found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tasks details (simple expanded view) */}
            {arForSelected.length ? (
              <Card className="rounded-2xl border bg-card/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Latest AR Tasks (most recent day)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {arForSelected[0]?.tasks?.length ? (
                    <div className="rounded-2xl border bg-card">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Module</TableHead>
                              <TableHead className="whitespace-nowrap">Task</TableHead>
                              <TableHead className="whitespace-nowrap">Start</TableHead>
                              <TableHead className="whitespace-nowrap">Finish</TableHead>
                              <TableHead className="whitespace-nowrap">Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {arForSelected[0].tasks.map((t) => (
                              <TableRow key={t.id} className="hover:bg-muted/50">
                                <TableCell className="whitespace-nowrap">
                                  <span className="text-sm">{t.module || "-"}</span>
                                </TableCell>
                                <TableCell className="min-w-[280px]">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{t.task}</span>
                                    {t.notes?.trim() ? (
                                      <span className="text-xs text-muted-foreground line-clamp-1">
                                        {t.notes}
                                      </span>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span className="text-sm">{fmt(t.startedAt)}</span>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span className="text-sm">{fmt(t.finishedAt)}</span>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {durationLabel(t.startedAt, t.finishedAt)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No tasks in latest AR.</div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </ModalShell>
    </div>
  )
}
