const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

function getToken() {
  return localStorage.getItem('smrs_token')
}

async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  try {
    const res = await fetch(API_BASE + path, { ...options, headers })

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('smrs_token')
        window.location.reload()
      }
      const errBody = await res.json().catch(() => ({}))
      const detail = errBody?.detail

      let message = `HTTP ${res.status}`
      if (typeof detail === 'string') message = detail
      else if (detail !== undefined) message = JSON.stringify(detail)

      throw new Error(message)
    }

    if (res.status === 204) return null
    return res.json()
  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the server is running on port 8000.')
    }
    throw e
  }
}

export const authService = {
  async login(username, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    localStorage.setItem('smrs_token', data.access_token)
    localStorage.setItem('smrs_user', data.username)
    return data
  },
  logout() {
    localStorage.removeItem('smrs_token')
    localStorage.removeItem('smrs_user')
  },
  isAuthenticated() {
    return !!getToken()
  },
  getUser() {
    return localStorage.getItem('smrs_user')
  },
}

export const studentService = {
  getAll: () => apiFetch('/students/getall'),
  getById: (id) => apiFetch(`/students/${id}`),
  create: (data) => apiFetch('/students/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/students/${id}`, { method: 'DELETE' }),
}

export const deficiencyService = {
  getAll: () => apiFetch('/deficiencies/'),
  getByStudent: (studentNumber) => apiFetch(`/deficiencies/student/${studentNumber}`),
  create: (data) => apiFetch('/deficiencies/', { method: 'POST', body: JSON.stringify(data) }),
  resolve: (id, dateResolved) =>
    apiFetch(`/deficiencies/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ date_resolved: dateResolved }),
    }),
  delete: (id) => apiFetch(`/deficiencies/${id}`, { method: 'DELETE' }),
}

export const gradeService = {
  getAll: () => apiFetch('/grades/'),
  getByStudent: (studentNumber) => apiFetch(`/grades/student/${studentNumber}`),
  create: (data) => apiFetch('/grades/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/grades/${id}`, { method: 'DELETE' }),
}

export const subjectService = {
  getAll: () => apiFetch('/subjects/'),
  getById: (id) => apiFetch(`/subjects/${id}`),
  create: (data) => apiFetch('/subjects/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/subjects/${id}`, { method: 'DELETE' }),
}

export const curriculumService = {
  getAll: () => apiFetch('/curriculum/'),
  getByCourse: (course) =>
    apiFetch(`/curriculum/?course=${encodeURIComponent(course)}`),
  create: (data) => apiFetch('/curriculum/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/curriculum/${id}`, { method: 'DELETE' }),
}

export const dashboardService = {
  getStats: () => apiFetch('/dashboard/stats'),
}

export default apiFetch
