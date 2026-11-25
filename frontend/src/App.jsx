
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Translator from './pages/Translator'
import Auth from './pages/Auth'

import {
  Learning,
  HistoryPage,
  Analytics,
  SettingsPage,
  Admin
} from './pages/BasicPages'

import { apiRequest } from './services/api'

// Load saved theme from MongoDB
function ThemeInitializer() {
  useEffect(() => {
    let active = true

    async function loadTheme() {
      try {
        const settings = await apiRequest('/settings')

        if (!active) return

        const preference = settings.theme || 'light'

        const effectiveTheme =
          preference === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light')
            : preference

        document.documentElement.dataset.theme = effectiveTheme
      } catch {
        document.documentElement.dataset.theme = 'light'
      }
    }

    loadTheme()

    return () => {
      active = false
    }
  }, [])

  return null
}

export default function App() {
  return (
    <>
      <ThemeInitializer />

      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<Auth />} />

        <Route
          path="/register"
          element={<Auth mode="register" />}
        />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          <Route path="translator" element={<Translator />} />

          <Route path="learning" element={<Learning />} />

          <Route path="history" element={<HistoryPage />} />

          <Route path="analytics" element={<Analytics />} />

          <Route path="settings" element={<SettingsPage />} />

          <Route path="admin" element={<Admin />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </>
  )
}
