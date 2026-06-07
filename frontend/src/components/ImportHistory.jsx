import React, { useEffect, useState } from 'react'
import { importService } from '../services/api'

// type: 'Appraisal' | 'Grade Report' | 'COR' | undefined (shows all)
export default function ImportHistory({ type }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await importService.getLogs()
      const filtered = type ? data.filter(l => l.type === type) : data
      setLogs(filtered)
    } catch (err) {
      console.error('Failed to load import history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [type])

  if (loading && logs.length === 0) return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading history...</div>

  if (logs.length === 0) return null

  return (
    <div className="table-card min" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Recent Imports</h3>
        <button className="btn btn-ghost" onClick={fetchLogs} style={{ padding: '4px 8px' }}>
          <i className="ph ph-arrows-clockwise" /> Refresh
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Filename / Subject</th>
            <th>Date</th>
            <th>Records Added</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.log_id}>
              <td style={{ fontWeight: 500 }}>{log.filename}</td>
              <td style={{ color: 'var(--text-muted)' }}>
                {new Date(log.imported_at).toLocaleString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </td>
              <td>
                <b style={{ color: 'var(--accent-green)' }}>+{log.records_created}</b>
              </td>
              <td>
                <span className="badge passed" style={{ padding: '2px 8px' }}>
                  <i className="ph ph-check" style={{ marginRight: '4px' }} /> {log.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
