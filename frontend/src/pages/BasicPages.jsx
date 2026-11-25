
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  History,
  ChartNoAxesCombined,
  Settings,
  Search,
  LockKeyhole,
  RefreshCw,
  Clock,
  Activity,
  BrainCircuit
} from 'lucide-react'

import { apiRequest } from '../services/api'

// Reusable Empty Module
function Empty({ icon: Icon, title, desc }) {
  return (
    <div className="panel">
      <div className="eyebrow">SIGNSAATHI WORKSPACE</div>
      <h1 className="page-title">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>

      <div className="mt-8 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
        <div className="rounded-2xl bg-brand-50 p-4 text-brand-600">
          <Icon size={28} />
        </div>

        <div className="mt-4 font-semibold">
          Module interface ready
        </div>

        <p className="mt-1 max-w-sm px-4 text-xs leading-5 text-slate-400">
          This module will display live user-specific data
          after its MongoDB integration is completed.
        </p>
      </div>
    </div>
  )
}

// Learning Mode
export function Learning() {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedLesson, setSelectedLesson] = useState(null)

  const lessonDetails = {
    alphabet: {
      description: 'Learn the basic fingerspelling alphabet used in Indian Sign Language.',
      topics: ['Introduction to ISL alphabet', 'Recognizing hand shapes', 'Practice A to Z'],
      duration: '15 minutes'
    },
    'daily-greetings': {
      description: 'Learn common greetings and expressions used in everyday conversations.',
      topics: ['Hello and Namaste', 'Good Morning', 'Thank You and Sorry'],
      duration: '10 minutes'
    },
    'daily-words': {
      description: 'Learn useful signs for common daily communication.',
      topics: ['Food and Water', 'Home and Family', 'Yes, No and Help'],
      duration: '12 minutes'
    }
  }

  async function loadLessons() {
    try {
      setLoading(true)
      setError('')
      const data = await apiRequest('/learning')
      setLessons(data.lessons || [])
    } catch (err) {
      setError(err.message || 'Unable to load lessons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLessons()
  }, [])

  async function completeLesson(lesson) {
    try {
      setSavingKey(lesson.key)
      setError('')
      setSuccess('')

      await apiRequest('/learning/progress', {
        method: 'POST',
        body: JSON.stringify({
          lesson_key: lesson.key,
          score: 100,
          completed: true
        })
      })

      setSuccess(`${lesson.title} completed successfully!`)
      setSelectedLesson(null)
      await loadLessons()
    } catch (err) {
      setError(err.message || 'Unable to save lesson progress')
    } finally {
      setSavingKey('')
    }
  }

  const completedCount = lessons.filter(
    (lesson) => lesson.progress?.completed
  ).length

  const progressPercent = lessons.length
    ? Math.round((completedCount / lessons.length) * 100)
    : 0

  if (loading) {
    return (
      <div className="panel py-12 text-center text-slate-500">
        Loading your learning lessons...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">SIGNSAATHI WORKSPACE</div>
          <h1 className="page-title">Learning Mode</h1>
          <p className="mt-2 text-sm text-slate-500">
            Learn Indian Sign Language through guided lessons and practice activities.
          </p>
        </div>

        <button
          onClick={loadLessons}
          className="btn-primary"
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh Lessons
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="panel-title">Your Learning Progress</h2>
            <p className="panel-subtitle">
              Track your completed lessons.
            </p>
          </div>

          <div className="text-2xl font-bold text-brand-600">
            {progressPercent}%
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>{completedCount} of {lessons.length} lessons completed</span>
          <span>{lessons.length - completedCount} remaining</span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson, index) => {
          const details = lessonDetails[lesson.key] || {
            description: 'Learn and practice this Indian Sign Language lesson.',
            topics: ['Introduction', 'Learning signs', 'Practice'],
            duration: '10 minutes'
          }
          const completed = Boolean(lesson.progress?.completed)

          return (
            <div className="panel flex flex-col" key={lesson.key}>
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                  <BookOpen size={25} />
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  completed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-violet-100 text-violet-700'
                }`}>
                  {completed ? 'Completed' : 'Not Started'}
                </span>
              </div>

              <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-brand-600">
                Lesson {index + 1}
              </div>
              <h2 className="mt-2 text-xl font-bold">{lesson.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {details.description}
              </p>

              <div className="mt-4 space-y-2">
                {details.topics.map((topic) => (
                  <div className="flex items-center gap-2 text-sm text-slate-600" key={topic}>
                    <span className="text-brand-600">✓</span>
                    {topic}
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500">
                Duration: {details.duration}
                {completed && (
                  <span className="ml-3 font-semibold text-green-600">
                    Score: {lesson.progress?.score ?? 100}%
                  </span>
                )}
              </div>

              <button
                className="btn-primary mt-5 w-full justify-center"
                onClick={() => setSelectedLesson(lesson)}
              >
                {completed ? 'Review Lesson' : 'Start Learning'}
              </button>
            </div>
          )
        })}
      </div>

      {lessons.length === 0 && !error && (
        <div className="panel py-10 text-center text-slate-500">
          No lessons are currently available.
        </div>
      )}

      {selectedLesson && (
        <div className="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="eyebrow">LESSON DETAILS</div>
              <h2 className="mt-2 text-xl font-bold">{selectedLesson.title}</h2>
            </div>
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              onClick={() => setSelectedLesson(null)}
            >
              Close
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            {lessonDetails[selectedLesson.key]?.description}
          </p>

          <div className="mt-5 rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-900">
            <strong>Practice Instructions:</strong>
            <p className="mt-2">
              Study the lesson topics and practice the corresponding hand signs.
              Once you finish practicing, mark this lesson as completed.
            </p>
          </div>

          <button
            className="btn-primary mt-5"
            disabled={savingKey === selectedLesson.key}
            onClick={() => completeLesson(selectedLesson)}
          >
            {savingKey === selectedLesson.key
              ? 'Saving Progress...'
              : 'Mark Lesson as Completed'}
          </button>
        </div>
      )}
    </div>
  )
}

// Translation History
export function HistoryPage() {
  const [history, setHistory] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadHistory() {
    try {
      setLoading(true)
      setError('')

      const data = await apiRequest('/translation-history')

      const records = Array.isArray(data)
        ? data
        : data?.history || data?.translations || data?.items || []

      setHistory(records)
    } catch (err) {
      setError(err.message || 'Unable to load translation history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return history

    return history.filter((item) => {
      const text =
        item.recognized_text ||
        item.translated_text ||
        item.text ||
        ''

      return String(text).toLowerCase().includes(term)
    })
  }, [history, search])

  function formatDate(value) {
    if (!value) return 'Date unavailable'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return String(value)
    }

    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  function formatConfidence(value) {
    if (value == null || value === '') return 'N/A'

    const number = Number(value)

    if (!Number.isFinite(number)) return 'N/A'

    return `${(number <= 1 ? number * 100 : number).toFixed(1)}%`
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">SIGNSAATHI WORKSPACE</div>

          <h1 className="page-title">
            Translation History
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Search and review your previous translations.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="btn-primary"
        >
          <RefreshCw
            size={17}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh History
        </button>
      </div>

      {/* Search and Count */}
      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Search size={19} className="shrink-0 text-slate-400" />

            <input
              className="field"
              type="text"
              placeholder="Search recognized words..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="text-sm text-slate-500">
            Total Records: <strong>{history.length}</strong>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="panel flex min-h-48 flex-col items-center justify-center text-center">
          <RefreshCw
            size={28}
            className="animate-spin text-brand-600"
          />

          <p className="mt-4 text-sm text-slate-500">
            Loading translation history...
          </p>
        </div>
      )}

      {/* History Records */}
      {!loading && !error && filteredHistory.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="mb-5 flex items-center gap-2">
            <History size={20} className="text-brand-600" />

            <h2 className="panel-title">
              Previous Translations
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-3">Sr. No.</th>
                  <th className="px-4 py-3">Recognized Text</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Date & Time</th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map((item, index) => {
                  const recognizedText =
                    item.recognized_text ||
                    item.translated_text ||
                    item.text ||
                    'Unknown'

                  return (
                    <tr
                      key={item._id || item.id || index}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-4 text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {recognizedText}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          {formatConfidence(item.confidence)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {item.model_name || item.model || 'N/A'}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        <span className="flex items-center gap-2">
                          <Clock size={14} />
                          {formatDate(item.created_at || item.timestamp)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty Search */}
      {!loading && !error && filteredHistory.length === 0 && (
        <div className="panel flex min-h-52 flex-col items-center justify-center text-center">
          <div className="rounded-2xl bg-brand-50 p-4 text-brand-600">
            <History size={28} />
          </div>

          <h2 className="mt-4 font-semibold">
            {history.length === 0
              ? 'No translation history found'
              : 'No matching translations'}
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            {history.length === 0
              ? 'Your saved translations will appear here.'
              : 'Try searching with another word.'}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Activity size={15} />
        Your translation records are loaded from your account.
      </div>

    </div>
  )
}

// Analytics
export function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadAnalytics() {
    try {
      setLoading(true)
      setError('')

      const result = await apiRequest('/analytics')
      setData(result)
    } catch (err) {
      setError(err.message || 'Unable to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const gestures = Array.isArray(data?.most_recognized)
    ? data.most_recognized
    : []

  const averageConfidence =
    data?.average_confidence != null
      ? `${(Number(data.average_confidence) * 100).toFixed(1)}%`
      : 'N/A'

  return (
    <div className="space-y-6">

      {/* Analytics Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">SIGNSAATHI WORKSPACE</div>

          <h1 className="page-title">
            Analytics
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Explore translation usage and recognition statistics.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="btn-primary"
        >
          <RefreshCw
            size={17}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh Analytics
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="panel flex min-h-48 flex-col items-center justify-center text-center">
          <RefreshCw
            size={28}
            className="animate-spin text-brand-600"
          />

          <p className="mt-4 text-sm text-slate-500">
            Loading analytics...
          </p>
        </div>
      )}

      {/* Analytics Data */}
      {!loading && data && !error && (
        <>

          {/* Statistics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Total Translations
                </span>
                <Activity className="text-brand-600" size={20} />
              </div>

              <div className="mt-4 text-3xl font-extrabold">
                {data.total_translations ?? 0}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Total saved translations
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Recognized Gestures
                </span>
                <BookOpen className="text-brand-600" size={20} />
              </div>

              <div className="mt-4 text-3xl font-extrabold">
                {gestures.length}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Unique recognized results
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Average Confidence
                </span>
                <ChartNoAxesCombined className="text-brand-600" size={20} />
              </div>

              <div className="mt-4 text-3xl font-extrabold">
                {averageConfidence}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Average prediction confidence
              </div>
            </div>

          </div>

          {/* Most Recognized Gestures */}
          <div className="panel">
            <div className="flex items-center gap-2 mb-5">
              <ChartNoAxesCombined className="text-brand-600" size={21} />

              <h2 className="panel-title">
                Most Recognized Gestures
              </h2>
            </div>

            {gestures.length > 0 ? (
              <div className="space-y-4">
                {gestures.map((item, index) => (
                  <div
                    key={item.recognized_text || index}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {item.recognized_text || 'Unknown'}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Recognized gesture
                      </div>
                    </div>

                    <div className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
                      {item.count} {item.count === 1 ? 'time' : 'times'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No gesture statistics available yet.
              </p>
            )}
          </div>

          {/* Model Performance */}
          <div className="panel">
            <div className="flex items-center gap-2">
              <BrainCircuit className="text-brand-600" size={21} />

              <h2 className="panel-title">
                Model Performance
              </h2>
            </div>

            {data.model_metrics ? (
              <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-50 p-4 text-sm">
                {JSON.stringify(data.model_metrics, null, 2)}
              </pre>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <BrainCircuit
                  size={28}
                  className="mx-auto text-brand-600"
                />

                <h3 className="mt-3 font-semibold">
                  No Evaluation Report Available
                </h3>

                <p className="mt-2 text-xs text-slate-400">
                  Train and evaluate the BiLSTM or Transformer
                  model to display genuine performance metrics.
                </p>
              </div>
            )}
          </div>

        </>
      )}

    </div>
  )
}

// Settings

export function SettingsPage() {
  const [settings, setSettings] = useState({
    preferred_voice: 'Google Hindi',
    speech_rate: 1,
    theme: 'light'
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Apply the selected theme to the whole application.
  function applyTheme(theme) {
    const effectiveTheme =
      theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light')
        : theme

    document.documentElement.dataset.theme = effectiveTheme
    document.documentElement.style.colorScheme = effectiveTheme
  }

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        setLoading(true)
        setError('')

        const data = await apiRequest('/settings')

        if (!active) return

        const loadedSettings = {
          preferred_voice: data.preferred_voice || 'Google Hindi',
          speech_rate: data.speech_rate ?? 1,
          theme: data.theme || 'light'
        }

        setSettings(loadedSettings)
        applyTheme(loadedSettings.theme)
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load settings')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [])

  function updateSetting(e) {
    const { name, value } = e.target

    const updatedValue =
      name === 'speech_rate' ? Number(value) : value

    setSettings((previous) => ({
      ...previous,
      [name]: updatedValue
    }))

    if (name === 'theme') {
      applyTheme(value)
    }

    setSuccess('')
    setError('')
  }

  async function saveSettings(e) {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Save preferences in MongoDB through the FastAPI backend.
      await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      })

      // Re-apply the selected theme after a successful save.
      applyTheme(settings.theme)

      setSuccess('Settings saved successfully!')
    } catch (err) {
      setError(err.message || 'Unable to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="panel py-12 text-center text-slate-500">
        Loading your settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">SIGNSAATHI WORKSPACE</div>
        <h1 className="page-title">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your voice, speech and appearance preferences.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={saveSettings} className="space-y-5">
        <div className="panel space-y-5">
          <div>
            <h2 className="panel-title">Speech Settings</h2>
            <p className="panel-subtitle">
              Customize text-to-speech preferences.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Preferred Voice
            </label>

            <select
              className="field"
              name="preferred_voice"
              value={settings.preferred_voice}
              onChange={updateSetting}
            >
              <option value="Google Hindi">Google Hindi</option>
              <option value="Google English">Google English</option>
              <option value="Default">Default Voice</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Speech Rate: {settings.speech_rate}x
            </label>

            <input
              className="w-full accent-violet-600"
              type="range"
              name="speech_rate"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.speech_rate}
              onChange={updateSetting}
            />

            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>Slow (0.5x)</span>
              <span>Normal (1x)</span>
              <span>Fast (2x)</span>
            </div>
          </div>
        </div>

        <div className="panel space-y-5">
          <div>
            <h2 className="panel-title">Appearance Settings</h2>
            <p className="panel-subtitle">
              Choose your preferred application theme.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Theme Preference
            </label>

            <select
              className="field"
              name="theme"
              value={settings.theme}
              onChange={updateSetting}
            >
              <option value="light">Light Theme</option>
              <option value="dark">Dark Theme</option>
              <option value="system">System Default</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}


 // Admin Panel
export function Admin() {
  const [users, setUsers] = useState([])
  const [modelStatus, setModelStatus] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  async function loadAdminData() {
    try {
      setLoading(true)
      setError('')

      const [userData, modelData, profileData] = await Promise.all([
        apiRequest('/admin/users'),
        apiRequest('/admin/model-status'),
        apiRequest('/profile')
      ])

      // Normalize MongoDB IDs so every user has a consistent string ID.
      const normalizedUsers = (userData.users || []).map((user) => ({
        ...user,
        id: String(user.id ?? user._id ?? user.user_id ?? '')
      }))

      setUsers(normalizedUsers)
      setModelStatus(modelData)
      setCurrentUser(profileData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Unable to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const activeUsers = users.filter((user) => user.is_active !== false).length
  const inactiveUsers = users.length - activeUsers

  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return (
      String(user.full_name || '').toLowerCase().includes(term) ||
      String(user.email || '').toLowerCase().includes(term) ||
      String(user.role || '').toLowerCase().includes(term)
    )
  })

  function formatDate(value) {
    if (!value) return 'N/A'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  async function toggleUserStatus(user) {
    const userId = String(user.id ?? user._id ?? user.user_id ?? '')

    if (!userId) {
      setError('User ID is missing. Refresh the Admin Panel and try again.')
      return
    }

    const nextStatus = user.is_active === false
    const action = nextStatus ? 'activate' : 'deactivate'

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${user.full_name || user.email}?`
      )
    ) {
      return
    }

    try {
      setUpdatingUserId(userId)
      setError('')
      setSuccess('')

      await apiRequest(`/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: nextStatus })
      })

      setUsers((previous) =>
        previous.map((item) =>
          String(item.id ?? item._id ?? item.user_id ?? '') === userId
            ? { ...item, id: userId, is_active: nextStatus }
            : item
        )
      )

      setSuccess(
        `${user.full_name || user.email} has been ${nextStatus ? 'activated' : 'deactivated'} successfully.`
      )
    } catch (err) {
      setError(err.message || `Unable to ${action} this user`)
    } finally {
      setUpdatingUserId('')
    }
  }

  if (loading) {
    return (
      <div className="panel py-12 text-center text-slate-500">
        Loading administration panel...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">SIGNSAATHI ADMINISTRATION</div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage registered users and monitor AI model status.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="btn-primary"
          disabled={loading || Boolean(updatingUserId)}
        >
          <RefreshCw size={17} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total Users</span>
            <Activity size={21} className="text-brand-600" />
          </div>
          <div className="mt-4 text-3xl font-extrabold">{users.length}</div>
          <p className="mt-1 text-xs text-slate-400">Registered accounts</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Active Users</span>
            <LockKeyhole size={21} className="text-green-600" />
          </div>
          <div className="mt-4 text-3xl font-extrabold">{activeUsers}</div>
          <p className="mt-1 text-xs text-slate-400">Active accounts</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Inactive Users</span>
            <History size={21} className="text-orange-500" />
          </div>
          <div className="mt-4 text-3xl font-extrabold">{inactiveUsers}</div>
          <p className="mt-1 text-xs text-slate-400">Inactive accounts</p>
        </div>
      </div>

      {/* User Management */}
      <div className="panel">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="panel-title">User Management</h2>
            <p className="panel-subtitle">
              Search users and activate or deactivate their accounts.
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {users.length} Users
          </span>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <Search size={19} className="shrink-0 text-slate-400" />
          <input
            className="field"
            type="search"
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-3">Sr. No.</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined On</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user, index) => {
                  const isActive = user.is_active !== false
                  const isCurrentUser =
                    currentUser?.email &&
                    currentUser.email.toLowerCase() ===
                      String(user.email || '').toLowerCase()
                  const userId = String(user.id ?? user._id ?? user.user_id ?? '')
                  const isUpdating = updatingUserId === userId

                  return (
                    <tr
                      key={userId || index}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-4 text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {user.full_name || 'Unknown'}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs font-normal text-brand-600">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {user.email}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          disabled={isCurrentUser || !userId || isUpdating || Boolean(updatingUserId)}
                          onClick={() => toggleUserStatus(user)}
                          title={
                            isCurrentUser
                              ? 'You cannot change your own admin account status'
                              : ''
                          }
                          className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                            isActive
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {isUpdating
                            ? 'Updating...'
                            : isActive
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">
            {users.length === 0
              ? 'No registered users found.'
              : 'No users match your search.'}
          </p>
        )}
      </div>

      {/* Model Status */}
      <div className="panel">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h2 className="panel-title">AI Model Status</h2>
            <p className="panel-subtitle">
              Current deep learning model availability.
            </p>
          </div>
        </div>

        {modelStatus ? (
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {JSON.stringify(modelStatus, null, 2)}
          </pre>
        ) : (
          <p className="mt-5 text-sm text-slate-400">
            Model status is not available.
          </p>
        )}
      </div>

      <div className="text-xs text-slate-400">
        Last updated: {formatDate(lastUpdated)}
      </div>
    </div>
  )
}
