import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import DashboardLayout from "./components/DashboardLayout"
import Index from "./App/Dashboard"
import Settings from "./App/Settings"
import Preferences from "./App/Settings/preferences"
import AcknowledgementReceiptTasks from "./App/AR"
import ARHistory from "./App/AR/history"
import Employees from "./App/HR"
import Attendance from "./App/HR/attendance"

import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./App/Login/login"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Index />} />

            <Route path="ar">
              <Route index element={<Navigate to="/ar/task" replace />} />
              <Route path="task" element={<AcknowledgementReceiptTasks />} />
              <Route path="history" element={<ARHistory />} />
            </Route>

            <Route path="hr">
              <Route path="employee" element={<Employees />} />
              <Route path="attendance" element={<Attendance />} />
            </Route>

            <Route path="settings">
              <Route path="usersettings" element={<Settings />} />
              <Route path="preferences" element={<Preferences />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
