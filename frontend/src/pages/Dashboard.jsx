
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Camera,
  GraduationCap,
  History,
  Activity,
  BrainCircuit,
  Target,
  Layers3
} from 'lucide-react'
import { apiRequest } from '../services/api'

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const data = await apiRequest('/analytics')

        if (active) {
          setAnalytics(data)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load dashboard data')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  const mostRecognized = analytics?.most_recognized

  const gestureName = Array.isArray(mostRecognized)
    ? mostRecognized[0]?.recognized_text ||
      mostRecognized[0]?.gesture ||
      mostRecognized[0]?.label ||
      '—'
    : typeof mostRecognized === 'string'
      ? mostRecognized
      : mostRecognized?.recognized_text ||
        mostRecognized?.gesture ||
        mostRecognized?.label ||
        '—'

  const averageConfidence =
    analytics?.average_confidence != null
      ? `${(Number(analytics.average_confidence) * 100).toFixed(1)}%`
      : '—'

  const cards = [
    {
      label: 'Total translations',
      value: loading ? '...' : analytics?.total_translations ?? '—',
      sub: 'Total saved translations'
    },
    {
      label: 'Most recognized gesture',
      value: loading ? '...' : gestureName,
      sub: 'Most frequently translated sign'
    },
    {
      label: 'Average confidence',
      value: loading ? '...' : averageConfidence,
      sub: 'Average prediction confidence'
    }
  ]

  const modelMetrics = [
    {
      label: 'Test Accuracy',
      value: '61.36%',
      icon: Target
    },
    {
      label: 'Validation Accuracy',
      value: '59.09%',
      icon: Activity
    },
    {
      label: 'Macro F1-Score',
      value: '57.00%',
      icon: Layers3
    }
  ]

  return (
    <div className="space-y-8">

      {/* Dashboard Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">OVERVIEW</div>

          <h1 className="page-title">
            Welcome to SignSaathi
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Your Indian Sign Language translation workspace.
          </p>
        </div>

        <Link to="/app/translator" className="btn-primary">
          <Camera size={17} />
          Open live translator
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {card.label}
              </span>

              <span className="stat-icon">
                <Activity size={18} />
              </span>
            </div>

            <div className="mt-4 text-3xl font-extrabold">
              {card.value}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Model Performance and Quick Access */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">

        {/* Model Performance */}
        <div className="panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="panel-title">
                Model Performance
              </h2>

              <p className="panel-subtitle">
                Evaluation results of the trained deep learning model
              </p>
            </div>

            <BrainCircuit className="text-brand-500" />
          </div>

          <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold text-slate-800">
                  BiLSTM ISL-40
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Indian Sign Language Recognition Model
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Trained
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {modelMetrics.map((metric) => {
                const Icon = metric.icon

                return (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-slate-100 bg-white p-3"
                  >
                    <div className="flex items-center gap-2 text-slate-500">
                      <Icon size={16} />
                      <span className="text-xs">
                        {metric.label}
                      </span>
                    </div>

                    <div className="mt-3 text-2xl font-extrabold text-slate-800">
                      {metric.value}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-brand-100 pt-3">
              <span className="text-xs text-slate-500">
                Supported gesture classes
              </span>

              <span className="text-sm font-bold text-brand-700">
                28 Classes
              </span>
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="panel">
          <h2 className="panel-title">
            Quick access
          </h2>

          <p className="panel-subtitle">
            Continue with a workspace module
          </p>

          <div className="mt-5 space-y-3">
            {[
              [Camera, 'Live Translator', 'Translate gestures', '/app/translator'],
              [GraduationCap, 'Learning Mode', 'Practice ISL signs', '/app/learning'],
              [History, 'Translation History', 'Review past translations', '/app/history']
            ].map(([Icon, title, desc, to]) => (
              <Link
                to={to}
                key={title}
                className="quick-link"
              >
                <span className="quick-icon">
                  <Icon size={19} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {title}
                  </span>

                  <span className="block text-xs text-slate-400">
                    {desc}
                  </span>
                </span>

                <ArrowUpRight
                  size={16}
                  className="text-slate-400"
                />
              </Link>
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}
