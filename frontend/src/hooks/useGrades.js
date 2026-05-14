import { useState, useCallback } from 'react'
import { gradeService } from '../services/api'
import { useData, useToast } from '../context/AppContext'

export function useGrades() {
  const { setGrades } = useData()
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await gradeService.getAll()
      setGrades(data)
    } catch (e) {
      toast('Failed to load grades: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [setGrades, toast])

  return { refresh, loading }
}
