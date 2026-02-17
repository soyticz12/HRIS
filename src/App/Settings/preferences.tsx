// src/App/Settings.tsx
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ThemeMode = "light" | "dark" | "system"

const STORAGE = {
  theme: "hris:theme",
  useSystem: "hris:theme:useSystem",
  avatar: "hris:user:avatar",
  compactTable: "hris:pref:compactTable",
  emailNotif: "hris:pref:emailNotif",
}

function getSystemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement // <html>
  const shouldBeDark =
    mode === "dark" ? true : mode === "light" ? false : getSystemPrefersDark()
  root.classList.toggle("dark", shouldBeDark)
}

function readBool(key: string, fallback: boolean) {
  const v = localStorage.getItem(key)
  if (v === null) return fallback
  return v === "true"
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="font-medium">{title}</div>
        {description ? (
          <div className="text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <div className="md:ml-6">{children}</div>
    </div>
  )
}

/** Simple switch (no shadcn switch required) */
function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className="inline-flex items-center gap-2"
      aria-pressed={checked}
    >
      <span
        className={[
          "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
          checked ? "bg-foreground" : "bg-muted",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </span>
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
    </button>
  )
}

export default function Settings() {
  // Theme
  const [useSystemTheme, setUseSystemTheme] = React.useState<boolean>(true)
  const [darkMode, setDarkMode] = React.useState<boolean>(false)

  // Profile
  const [avatarDataUrl, setAvatarDataUrl] = React.useState<string | null>(null)

  // Other prefs
  const [compactTable, setCompactTable] = React.useState<boolean>(false)
  const [emailNotif, setEmailNotif] = React.useState<boolean>(true)

  // Change password (UI only)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [pwMsg, setPwMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(
    null
  )

  // Init from localStorage
  React.useEffect(() => {
    // Theme
    const savedUseSystem = readBool(STORAGE.useSystem, true)
    setUseSystemTheme(savedUseSystem)

    const savedTheme = (localStorage.getItem(STORAGE.theme) as ThemeMode | null) ?? "system"
    const resolvedTheme: ThemeMode = savedUseSystem ? "system" : savedTheme === "system" ? "light" : savedTheme
    setDarkMode(resolvedTheme === "dark")
    applyTheme(savedUseSystem ? "system" : resolvedTheme)

    // Avatar
    const savedAvatar = localStorage.getItem(STORAGE.avatar)
    setAvatarDataUrl(savedAvatar)

    // Other prefs
    setCompactTable(readBool(STORAGE.compactTable, false))
    setEmailNotif(readBool(STORAGE.emailNotif, true))
  }, [])

  // When system theme changes and we follow system
  React.useEffect(() => {
    if (!useSystemTheme) return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    if (mq.addEventListener) mq.addEventListener("change", handler)
    else mq.addListener(handler)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler)
      else mq.removeListener(handler)
    }
  }, [useSystemTheme])

  // Persist + apply theme when toggles change
  React.useEffect(() => {
    localStorage.setItem(STORAGE.useSystem, String(useSystemTheme))
    if (useSystemTheme) {
      localStorage.setItem(STORAGE.theme, "system")
      applyTheme("system")
    } else {
      const mode: ThemeMode = darkMode ? "dark" : "light"
      localStorage.setItem(STORAGE.theme, mode)
      applyTheme(mode)
    }
  }, [useSystemTheme, darkMode])

  // Persist other prefs
  React.useEffect(() => {
    localStorage.setItem(STORAGE.compactTable, String(compactTable))
  }, [compactTable])

  React.useEffect(() => {
    localStorage.setItem(STORAGE.emailNotif, String(emailNotif))
  }, [emailNotif])

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Basic validation (keep it simple)
    if (!file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      setAvatarDataUrl(result)
      localStorage.setItem(STORAGE.avatar, result)
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatarDataUrl(null)
    localStorage.removeItem(STORAGE.avatar)
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMsg({ type: "err", text: "Please fill in all password fields." })
      return
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: "err", text: "New password must be at least 8 characters." })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "err", text: "New password and confirmation do not match." })
      return
    }

    // ✅ UI-only for now. Replace with your API call:
    // await api.changePassword({ currentPassword, newPassword })
    setPwMsg({ type: "ok", text: "Password updated (demo). Connect this to your API." })
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences (saved on this device unless connected to your backend).
        </p>
      </div>

      {/* Appearance */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            title="Follow system theme"
            description="Automatically match your device theme."
          >
            <Switch checked={useSystemTheme} onCheckedChange={setUseSystemTheme} />
          </SettingRow>

          <SettingRow
            title="Dark mode"
            description={
              useSystemTheme
                ? "Disabled while following system theme."
                : "Toggle between light and dark mode."
            }
          >
            <Switch
              checked={darkMode}
              onCheckedChange={setDarkMode}
              label={darkMode ? "Dark" : "Light"}
            />
          </SettingRow>

          <div className="text-xs text-muted-foreground">
            Current:{" "}
            <span className="font-medium text-foreground">
              {useSystemTheme ? "system" : darkMode ? "dark" : "light"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            title="Profile picture"
            description="Upload a profile photo (stored locally for now)."
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full border bg-muted">
                {avatarDataUrl ? (
                  <img
                    src={avatarDataUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    N/A
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarChange}
                  />
                  <span className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted">
                    Upload
                  </span>
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeAvatar}
                  disabled={!avatarDataUrl}
                >
                  Remove
                </Button>
              </div>
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            title="Compact table density"
            description="Make tables tighter to show more rows."
          >
            <Switch checked={compactTable} onCheckedChange={setCompactTable} />
          </SettingRow>

          <SettingRow
            title="Email notifications"
            description="Receive updates about attendance and HR events."
          >
            <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
          </SettingRow>

          <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
            Tip: later you can read these preferences in other pages (Dashboard/Table)
            using <span className="font-mono">localStorage</span> keys:
            <div className="mt-2 font-mono text-xs">
              {STORAGE.compactTable} / {STORAGE.emailNotif}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Current password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentPassword(e.target.value)
                  }
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">New password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPassword(e.target.value)
                  }
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Confirm new password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            {pwMsg ? (
              <div
                className={[
                  "rounded-lg border p-3 text-sm",
                  pwMsg.type === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200",
                ].join(" ")}
              >
                {pwMsg.text}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                  setPwMsg(null)
                }}
              >
                Clear
              </Button>
              <Button type="submit">Update password</Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Note: This page currently shows UI only for password change. Hook it up to your backend
              (API) to make it real.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
