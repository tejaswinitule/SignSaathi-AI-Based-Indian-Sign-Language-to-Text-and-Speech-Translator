
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.detail || data.message || `Request failed (${response.status})`
    )
  }

  return data
}

export const authApi = {
  register: (payload) =>
    apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload) =>
    apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  logout: () =>
    apiRequest('/logout', {
      method: 'POST'
    }),

  profile: () =>
    apiRequest('/profile')
}

export const translatorApi = {
  predict: (payload) =>
    apiRequest('/predict', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  history: () =>
    apiRequest('/translation-history')
}

export { API_BASE }
