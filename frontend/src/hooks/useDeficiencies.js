import { useState, useCallback } from 'react'
import { deficiencyService } from '../services/api'
import { useData, useToast } from '../context/AppContext'

export function useDeficiencies() {
  const { setDeficiencies } = useData()
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await deficiencyService.getAll()
      setDeficiencies(data)
    } catch (e) {
      toast('Failed to load deficiencies: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [setDeficiencies, toast])

  return { refresh, loading }
}
