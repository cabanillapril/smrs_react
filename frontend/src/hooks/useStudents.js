import { useState, useCallback } from 'react'
import { studentService } from '../services/api'
import { useData, useToast } from '../context/AppContext'

export function useStudents() {
  const { students, setStudents, addActivity } = useData()
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await studentService.getAll()
      setStudents(data)
      return data
    } catch (e) {
      toast('Failed to load students: ' + e.message, 'error')
      return []
    } finally {
      setLoading(false)
    }
  }, [setStudents, toast])

  return { students, refresh, loading }
}
