export type UserSession = {
  username: string
  role: "admin" | "user"
}

const USERS_KEY = "hris:users"
const SESSION_KEY = "hris:session"

type StoredUser = {
  username: string
  password: string
  role: "admin" | "user"
}

// Seed initial admin once
export function ensureInitialAdmin() {
  const raw = localStorage.getItem(USERS_KEY)
  if (raw) return

  const initial: StoredUser[] = [
    { username: "admin", password: "admin123", role: "admin" }, // 👈 change password!
  ]
  localStorage.setItem(USERS_KEY, JSON.stringify(initial))
}

export function getSession(): UserSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserSession
  } catch {
    return null
  }
}

export function login(username: string, password: string): UserSession | null {
  ensureInitialAdmin()

  const raw = localStorage.getItem(USERS_KEY)
  const users: StoredUser[] = raw ? (JSON.parse(raw) as StoredUser[]) : []

  const u = users.find(
    (x) => x.username === username.trim() && x.password === password
  )
  if (!u) return null

  const session: UserSession = { username: u.username, role: u.role }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}
