import * as React from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { ensureInitialAdmin, getSession } from "@/lib/auth"

export default function ProtectedRoute() {
  const location = useLocation()

  React.useEffect(() => {
    ensureInitialAdmin()
  }, [])

  const session = getSession()
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
