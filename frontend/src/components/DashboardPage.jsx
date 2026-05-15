import { useData } from '../context/AppContext'

const YEAR_ORDINALS = ['', '1st', '2nd', '3rd', '4th']

export default function DashboardPage({ stats, onNavigate, onAddStudent, user }) {
  const { activities, students, deficiencies } = useData()

  // Bar chart data
  const courseConfigs = [
    { label: 'BSIT', search: 'Bachelor of Science in Industrial Technology', years: 4 },
    { label: 'BSMAT', search: 'Bachelor of Science in Mechatronics and Automation Technology', years: 4 },
    { label: '2-Year', search: '2-Year Program', years: 2 },
    { label: '1-Year', search: '1-Year Program', years: 1 },
  ]

  const counts = courseConfigs.map((c) =>
    Array.from({ length: c.years }, (_, i) =>
      students.filter(
        (s) => (s.course || '').includes(c.search) && s.year_level === i + 1 && s.status !== 'Graduated'
      ).length
    )
  )

  const max = Math.max(...counts.flat(), 1)

  // Donut chart data (Regular vs Irregular only; exclude deficiencies)
  const activeStudents = students.filter((s) => s.status !== 'Graduated')
  const regularCount = activeStudents.filter((s) => s.status === 'Regular').length
  const irregularCount = activeStudents.filter((s) => s.status === 'Irregular').length
  const total = regularCount + irregularCount || 1
  const circumference = 289

  const rPerc = (regularCount / total) * circumference
  const iPerc = (irregularCount / total) * circumference


  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user || 'Administrator'}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={onAddStudent}>
            <i className="ph ph-plus" /> Add Student
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-green">
          <div className="stat-top">
            <span className="stat-label">Active</span>
            <span className="stat-icon"><i className="ph ph-file-text" /></span>
          </div>
          <div className="stat-value">{stats?.active_students ?? '—'}</div>
          <div className="stat-change positive">Excludes graduated</div>
        </div>

        <div className="stat-card stat-blue">
          <div className="stat-top">
            <span className="stat-label">Total</span>
            <span className="stat-icon"><i className="ph ph-users" /></span>
          </div>
          <div className="stat-value">{stats?.total_students ?? '—'}</div>
          <div className="stat-change positive">All students</div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-top">
            <span className="stat-label">Deficient</span>
            <span className="stat-icon"><i className="ph ph-warning-circle" /></span>
          </div>
          <div className="stat-value">{stats?.pending_deficiencies ?? '—'}</div>
          <div className="stat-change negative">Requires attention</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Enrollment by Year Level</span>
            <div className="chart-legend">
              <span className="legend-dot blue"></span> 1st Year
              <span className="legend-dot green"></span> 2nd Year
              <span className="legend-dot orange"></span> 3rd Year
              <span className="legend-dot red"></span> 4th Year
            </div>
          </div>
          <div className="bar-chart">
            {courseConfigs.map((c, ci) => (
              <div key={c.label} className="bar-group">
                <div className="bar-label">{c.label}</div>
                <div className="bars">
                  {counts[ci].map((count, yi) => (
                    <div
                      key={yi}
                      className={`bar b${yi + 1}`}
                      style={{ '--h': `${(count / max) * 100}%` }}
                      title={`${count} students`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Status Breakdown</span>
          </div>
          <div className="donut-wrap">
            <svg viewBox="0 0 120 120" className="donut-svg">
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--border)" strokeWidth="16" />
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--accent-blue)" strokeWidth="16"
                strokeDasharray={`${rPerc} ${circumference - rPerc}`} strokeDashoffset="0" className="donut-seg" />
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--accent-green)" strokeWidth="16"
                strokeDasharray={`${iPerc} ${circumference - iPerc}`} strokeDashoffset={`${-rPerc}`} className="donut-seg" />

            </svg>
            <div className="donut-center">
              <span className="donut-num">{regularCount + irregularCount}</span>

              <span className="donut-lbl">Total</span>
            </div>
          </div>
          <div className="donut-legend">
            <div className="dl-item">
              <span className="dl-dot" style={{ background: 'var(--accent-blue)' }} />
              <span>Regular</span><b>{regularCount}</b>
            </div>
            <div className="dl-item">
              <span className="dl-dot" style={{ background: 'var(--accent-green)' }} />
              <span>Irregular</span><b>{irregularCount}</b>
            </div>
          </div>

        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Recent Activity</span>
          <a href="#" className="view-all">Live log</a>
        </div>
        <div className="activity-list">
          {activities.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activity.</p>
          ) : activities.map((a, i) => (
            <div key={i} className="activity-item">
              <div className={`activity-dot ${a.type}`} />
              <div className="activity-body">
                <span className="activity-text" dangerouslySetInnerHTML={{ __html: a.text }} />
                <span className="activity-time">{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
