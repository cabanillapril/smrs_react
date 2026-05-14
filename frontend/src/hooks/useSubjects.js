import { useState, useCallback } from 'react'
import { subjectService } from '../services/api'
import { useData, useToast } from '../context/AppContext'

export function useSubjects() {
  const { setSubjects } = useData()
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await subjectService.getAll()
      setSubjects(data)
    } catch (e) {
      toast('Failed to load subjects: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [setSubjects, toast])

  return { refresh, loading }
}
