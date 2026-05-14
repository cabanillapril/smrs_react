import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, msg, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [students, setStudents] = useState([])
  const [deficiencies, setDeficiencies] = useState([])
  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [activities, setActivities] = useState([])

  const addActivity = useCallback((text, type = 'blue') => {
    setActivities((prev) => {
      const next = [{ text, type, time: new Date().toLocaleString() }, ...prev]
      return next.slice(0, 15)
    })
  }, [])

  return (
    <DataContext.Provider
      value={{
        students, setStudents,
        deficiencies, setDeficiencies,
        grades, setGrades,
        subjects, setSubjects,
        activities,
        addActivity,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
