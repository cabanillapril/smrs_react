import { useCallback } from 'react'
import { studentService } from '../services/api'
import { useData, useToast } from '../context/AppContext'

export function useStudents() {
  const { students, setStudents, addActivity } = useData()
  const toast = useToast()

  const refresh = useCallback(async () => {
    try {
      const data = await studentService.getAll()
      setStudents(data)
      return data
    } catch (e) {
      toast('Failed to load students: ' + e.message, 'error')
      return []
    }
  }, [setStudents, toast])

  return { students, refresh }
}
