export default function ReportsPage() {
  function downloadReport(type) {
    const url = `http://127.0.0.1:8000/reports/${type}`
    window.open(url, '_blank')
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and download academic reports as CSV</p>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <div className="report-icon" style={{ background: 'var(--accent-blue)20', color: 'var(--accent-blue)' }}>
            <i className="ph ph-users" />
          </div>
          <div className="report-info">
            <div className="report-title">Enrollment Report</div>
            <div className="report-desc">All enrolled students by course and year level</div>
          </div>
          <button className="btn btn-ghost sm" onClick={() => downloadReport('enrollment')}>
            Download CSV
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon" style={{ background: 'var(--accent-orange)20', color: 'var(--accent-orange)' }}>
            <i className="ph ph-warning-circle" />
          </div>
          <div className="report-info">
            <div className="report-title">Deficiency Report</div>
            <div className="report-desc">List of students with active deficiencies</div>
          </div>
          <button className="btn btn-ghost sm" onClick={() => downloadReport('deficiency')}>
            Download CSV
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon" style={{ background: 'var(--accent-green)20', color: 'var(--accent-green)' }}>
            <i className="ph ph-file-text" />
          </div>
          <div className="report-info">
            <div className="report-title">Grade Summary</div>
            <div className="report-desc">All recorded grades with remarks</div>
          </div>
          <button className="btn btn-ghost sm" onClick={() => downloadReport('grades')}>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
