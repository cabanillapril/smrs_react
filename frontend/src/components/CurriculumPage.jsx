import { useState, useEffect } from 'react'
import { useData } from '../context/AppContext'
import { COURSE_TAB_KEYS } from '../utils/constants'
import { curriculumService } from '../services/api'
import MajorSelect from './MajorSelect'

export default function CurriculumPage({ onAddToCurriculum }) {
  const { subjects } = useData()
  const [activeTab, setActiveTab] = useState('bsit')
  const [major, setMajor] = useState('')
  const [curriculum, setCurriculum] = useState([])
  const [loading, setLoading] = useState(false)

  const courseName = COURSE_TAB_KEYS[activeTab]

  useEffect(() => {
    loadCurriculum()
  }, [activeTab, major])

  async function loadCurriculum() {
    setLoading(true)
    try {
      const data = await curriculumService.getByCourse(courseName)
      // Filter by major if selected
      const filtered = major ? data.filter(c => c.major === major) : data
      setCurriculum(filtered)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Group by year and semester
  const grouped = curriculum.reduce((acc, item) => {
    const key = `${item.year_level}-${item.semester}`
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum</h1>
          <p className="page-subtitle">Program curricula and subject structures</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => onAddToCurriculum(courseName)}>
            + Add to Curriculum
          </button>
        </div>
      </div>

      <div className="curriculum-tabs">
        {Object.keys(COURSE_TAB_KEYS).map((key) => (
          <button
            key={key}
            className={`curr-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => { setActiveTab(key); setMajor(''); }}
          >
            {key === 'bsit' ? 'BSIT' : key === 'bsmat' ? 'BSMAT' : key === 'two-year' ? '2-Year' : '1-Year'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <MajorSelect
          className="filter-select"
          program={courseName}
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          emptyLabel="All Majors"
          style={{ margin: 4 }}
        />
      </div>

      <div className="curr-grid" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading curriculum…</p>
        ) : (
          (() => {
            const maxYears = (activeTab === 'bsit' || activeTab === 'bsmat') ? 4 : (activeTab === 'two-year') ? 2 : 1
            const yearsArray = Array.from({ length: maxYears }, (_, i) => i + 1)

            return yearsArray.map(year => (
              <div key={year} className="year-section">
                <h2 style={{ paddingBottom: '12px', borderBottom: '2px solid var(--border)', marginBottom: '16px', color: 'var(--text-primary)' }}>
                  {year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {[1, 2].map(sem => {
                    const items = grouped[`${year}-${sem}`] || []
                    const totalUnits = items.reduce((sum, item) => sum + (item.unit || 0), 0)

                    return (
                      <div key={sem} className="curr-year-card" style={{ overflow: 'hidden' }}>
                        <div className="curr-year-header" style={{ background: 'var(--bg-raised)', padding: '12px 16px', fontWeight: '700', borderBottom: '1px solid var(--border)' }}>
                          {sem === 1 ? 'First' : 'Second'} Semester
                        </div>
                        <table className="data-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '20%' }}>Subject Code</th>
                              <th>Descriptive Title</th>
                              <th style={{ width: '15%', textAlign: 'center' }}>Units</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length > 0 ? items.map(item => (
                              <tr key={item.id}>
                                <td><b>{item.subject_code}</b></td>
                                <td>{item.subject_name}</td>
                                <td style={{ textAlign: 'center' }}>{item.unit}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  No subjects added for this semester yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: 'var(--bg-raised)' }}>
                              <td colSpan="2" style={{ textAlign: 'right', fontWeight: '600', padding: '12px 16px', borderBottom: 'none' }}>
                                Total Units
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-blue)', padding: '12px 16px', borderBottom: 'none' }}>
                                {totalUnits}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          })()
        )}
      </div>
    </div>
  )
}
