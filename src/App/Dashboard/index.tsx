// src/App/Settings.tsx
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type BulletinPriority = "normal" | "important" | "urgent"

type Bulletin = {
  id: string
  title: string
  message: string
  createdAt: string // ISO
  author: string
  priority: BulletinPriority
  pinned: boolean
  read: boolean
}

type CompanyEvent = {
  id: string
  title: string
  time: string // "09:00"
  location?: string
  type: "meeting" | "deadline" | "activity" | "reminder"
}

const STORAGE_KEY = "hris:dashboard:bulletins"

function uid(prefix = "ID") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

function fmtDateTime(d: Date) {
  const date = d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  })
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  return { date, time }
}

function Pill({
  label,
  variant,
}: {
  label: string
  variant: "muted" | "info" | "warning" | "danger" | "success"
}) {
  const styles =
    variant === "muted"
      ? "border-muted-foreground/20 bg-muted text-muted-foreground"
      : variant === "info"
      ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200"
      : variant === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
      : variant === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles
      )}
    >
      {label}
    </span>
  )
}

function PriorityPill({ p }: { p: BulletinPriority }) {
  if (p === "urgent") return <Pill label="Urgent" variant="danger" />
  if (p === "important") return <Pill label="Important" variant="warning" />
  return <Pill label="Normal" variant="muted" />
}

function fmt(dtIso: string | null) {
  if (!dtIso) return "-"
  const dt = new Date(dtIso)
  if (Number.isNaN(dt.getTime())) return String(dtIso)

  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}


function EventPill({ type }: { type: CompanyEvent["type"] }) {
  if (type === "deadline") return <Pill label="Deadline" variant="danger" />
  if (type === "meeting") return <Pill label="Meeting" variant="info" />
  if (type === "activity") return <Pill label="Activity" variant="success" />
  return <Pill label="Reminder" variant="warning" />
}

const DEFAULT_EVENTS: CompanyEvent[] = [
  { id: "EVT-1", title: "Payroll processing", time: "09:00", type: "deadline" },
  { id: "EVT-2", title: "Finance huddle", time: "10:30", location: "Zoom", type: "meeting" },
  { id: "EVT-3", title: "HR onboarding session", time: "13:00", location: "Room 2A", type: "activity" },
  { id: "EVT-4", title: "Submit daily AR", time: "16:30", type: "reminder" },
]

function readBulletins(): Bulletin[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Bulletin[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeBulletins(items: Bulletin[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string | number
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

export default function Dashboard() {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const { date, time } = fmtDateTime(now)

  // Bulletin form
  const [title, setTitle] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [author, setAuthor] = React.useState("Admin")
  const [priority, setPriority] = React.useState<BulletinPriority>("normal")

  // UI filters
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState<"all" | "unread" | "pinned">("all")

  const [bulletins, setBulletins] = React.useState<Bulletin[]>(() => {
    const saved = readBulletins()
    // nice demo seed if empty
    if (saved.length) return saved
    const seed: Bulletin[] = [
      {
        id: uid("BUL"),
        title: "Welcome to the HRIS Dashboard",
        message: "Check announcements here. Pin important items so everyone sees them.",
        createdAt: new Date().toISOString(),
        author: "System",
        priority: "normal",
        pinned: true,
        read: false,
      },
      {
        id: uid("BUL"),
        title: "Payroll cutoff today",
        message: "Please finalize payroll computations before 3:00 PM.",
        createdAt: new Date().toISOString(),
        author: "Finance",
        priority: "important",
        pinned: false,
        read: false,
      },
    ]
    writeBulletins(seed)
    return seed
  })

  React.useEffect(() => {
    writeBulletins(bulletins)
  }, [bulletins])

  const addBulletin = () => {
    const t = title.trim()
    const m = message.trim()
    if (!t || !m) return

    const entry: Bulletin = {
      id: uid("BUL"),
      title: t,
      message: m,
      createdAt: new Date().toISOString(),
      author: author.trim() || "Admin",
      priority,
      pinned: priority === "urgent",
      read: false,
    }

    setBulletins((prev) => [entry, ...prev])
    setTitle("")
    setMessage("")
    setPriority("normal")
  }

  const togglePinned = (id: string) => {
    setBulletins((prev) =>
      prev.map((b) => (b.id === id ? { ...b, pinned: !b.pinned } : b))
    )
  }

  const toggleRead = (id: string) => {
    setBulletins((prev) =>
      prev.map((b) => (b.id === id ? { ...b, read: !b.read } : b))
    )
  }

  const removeBulletin = (id: string) => {
    setBulletins((prev) => prev.filter((b) => b.id !== id))
  }

  const markAllRead = () => {
    setBulletins((prev) => prev.map((b) => ({ ...b, read: true })))
  }

  const clearAll = () => setBulletins([])

  const unreadCount = bulletins.filter((b) => !b.read).length
  const pinnedCount = bulletins.filter((b) => b.pinned).length

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return bulletins
      .filter((b) => {
        const byFilter =
          filter === "all"
            ? true
            : filter === "unread"
            ? !b.read
            : b.pinned

        const bySearch =
          !q ||
          `${b.title} ${b.message} ${b.author} ${b.priority}`.toLowerCase().includes(q)

        return byFilter && bySearch
      })
      .sort((a, b) => {
        // pinned first, then newest
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [bulletins, filter, search])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Quick view of announcements and what’s happening today.
          </p>
        </div>

        <Card className="rounded-2xl border bg-card/60 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{date}</div>
              <div className="text-xs text-muted-foreground">Company time</div>
            </div>
            <div className="ml-auto font-mono text-lg">{time}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Bulletins" value={bulletins.length} hint={`${pinnedCount} pinned`} />
        <StatCard title="Unread" value={unreadCount} hint="Needs your attention" />
        <StatCard title="Today’s Events" value={DEFAULT_EVENTS.length} hint="Schedule & reminders" />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bulletin Board */}
        <Card className="lg:col-span-2 rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Bulletin Board</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Post updates for everyone. Pin important items.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markAllRead} disabled={!bulletins.length}>
                  Mark all read
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll} disabled={!bulletins.length}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Create bulletin */}
            <div className="rounded-2xl border bg-background p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm text-muted-foreground">Title</label>
                  <Input
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    placeholder="e.g., Payroll cutoff today"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setPriority(e.target.value as BulletinPriority)
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <label className="text-sm text-muted-foreground">Message</label>
                <textarea
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  placeholder="Write a short announcement..."
                  className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Posted by</label>
                  <Input
                    value={author}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthor(e.target.value)}
                    className="h-9 w-[180px]"
                    placeholder="Admin"
                  />
                </div>

                <Button
                  onClick={addBulletin}
                  disabled={!title.trim() || !message.trim()}
                >
                  Post Bulletin
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <Input
                placeholder="Search bulletins..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="md:max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={filter === "unread" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("unread")}
                >
                  Unread
                </Button>
                <Button
                  variant={filter === "pinned" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("pinned")}
                >
                  Pinned
                </Button>
              </div>
            </div>

            {/* Bulletin list */}
            <div className="space-y-3">
              {filtered.length ? (
                filtered.map((b) => (
                  <div
                    key={b.id}
                    className={cx(
                      "rounded-2xl border bg-background p-4 transition",
                      !b.read && "ring-1 ring-primary/20"
                    )}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold">{b.title}</div>
                          {b.pinned ? <Pill label="Pinned" variant="info" /> : null}
                          <PriorityPill p={b.priority} />
                          {!b.read ? <Pill label="Unread" variant="warning" /> : <Pill label="Read" variant="muted" />}
                        </div>

                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {b.message}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>By: <span className="font-medium text-foreground">{b.author}</span></span>
                          <span>•</span>
                          <span>{fmt(b.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePinned(b.id)}
                        >
                          {b.pinned ? "Unpin" : "Pin"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRead(b.id)}
                        >
                          {b.read ? "Mark unread" : "Mark read"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeBulletin(b.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border bg-background p-6 text-center">
                  <div className="font-medium">No bulletins found</div>
                  <div className="text-sm text-muted-foreground">
                    Try another search or post a new bulletin.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* What's happening now */}
        <Card className="rounded-2xl border bg-card/60 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle>What’s happening now</CardTitle>
            <div className="text-sm text-muted-foreground">
              Today’s agenda & reminders.
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-sm text-muted-foreground">Today</div>
              <div className="text-lg font-semibold">{date}</div>
            </div>

            <div className="space-y-2">
              {DEFAULT_EVENTS.map((ev) => (
                <div key={ev.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {ev.time}
                        {ev.location ? ` • ${ev.location}` : ""}
                      </div>
                    </div>
                    <EventPill type={ev.type} />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border bg-background p-4">
              <div className="text-sm text-muted-foreground">Quick tip</div>
              <div className="text-sm">
                Use the Bulletin Board to post updates like payroll cutoffs, meetings,
                policy changes, and reminders.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
