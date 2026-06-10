import { useState } from 'react'
import { useData } from '../context/AppContext'
import { SECTIONS, PROGRAMS, YEAR_LEVELS, DEFICIENCY_TYPES } from '../utils/constants'

import { useDeficiencies } from '../hooks/useDeficiencies'
import { deficiencyService } from '../services/api'
import MajorSelect from './MajorSelect'
import { StatusBadge } from './Badges'

export default function DeficienciesPage({ onAdd, onViewStudent }) {
  const { deficiencies, students } = useData()
  const { refresh, loading } = useDeficiencies()


  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [semester, setSemester] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [sortBy, setSortBy] = useState('default')

  const availableSchoolYears = [...new Set(deficiencies.map(d => d.school_year).filter(Boolean))].sort((a, b) => b.localeCompare(a))

  let filtered = deficiencies.filter((d) => {
    const student = students.find(s => s.student_id === d.student_id)
    const studentName = student ? (student.first_name + ' ' + student.last_name).toLowerCase() : ''

    const matchesSearch =
      studentName.includes(search.toLowerCase()) ||
      d.student_id.toLowerCase().includes(search.toLowerCase()) ||
      d.subject_code.toLowerCase().includes(search.toLowerCase())

    const matchesCourse = !course || student?.course === course
    const matchesMajor = !major || student?.major === major
    const matchesYear = !year || student?.year_level === parseInt(year)
    const matchesSection = !section || student?.section === section
    const matchesSemester = !semester || String(d.semester) === String(semester)
    const matchesSchoolYear = !schoolYear || d.school_year === schoolYear

    return matchesSearch && matchesCourse && matchesMajor && matchesYear && matchesSection && matchesSemester && matchesSchoolYear
  })

  if (sortBy === 'alpha') {
    filtered.sort((a, b) => {
      const sA = students.find(s => s.student_id === a.student_id)
      const sB = students.find(s => s.student_id === b.student_id)
      const nameA = sA ? `${sA.last_name}, ${sA.first_name}`.toLowerCase() : 'zzzz'
      const nameB = sB ? `${sB.last_name}, ${sB.first_name}`.toLowerCase() : 'zzzz'
      return nameA.localeCompare(nameB)
    })
  } else if (sortBy === 'date') {
    filtered.sort((a, b) => {
      const dateA = new Date(a.date_recorded || 0)
      const dateB = new Date(b.date_recorded || 0)
      return dateB - dateA
    })
  }

  async function handleResolve(id) {
    if (!confirm('Mark this deficiency as resolved?')) return
    try {
      await deficiencyService.resolve(id, new Date().toISOString().split('T')[0])
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDelete(deficiencyId) {
    if (!confirm('Delete this deficiency record?')) return
    try {
      await deficiencyService.delete(deficiencyId)
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h1 className="page-title">Deficiencies</h1>
          <p className="page-subtitle">Track and manage student academic deficiencies</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={onAdd}>+ Record Deficiency</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-field">
          <span><i className="ph ph-magnifying-glass" /></span>
          <input
            type="text"
            placeholder="Search by student or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="filter-select" value={course} onChange={(e) => { setCourse(e.target.value); setMajor(''); }}>
          <option value="">All Programs</option>
          {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <MajorSelect
          className="filter-select"
          program={course}
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          emptyLabel="All Majors"
        />

        <select className="filter-select" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All Years</option>
          {YEAR_LEVELS.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
        </select>

        <select className="filter-select" value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="">All Sections</option>
          {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="filter-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">All Semesters</option>
          <option value="1">1st Semester</option>
          <option value="2">2nd Semester</option>
          <option value="3">Summer</option>
        </select>

        <select className="filter-select" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)}>
          <option value="">All School Years</option>
          {availableSchoolYears.map(sy => <option key={sy} value={sy}>{sy}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', marginRight: '16px' }}>
          <i className="ph ph-sort-ascending" style={{ color: 'var(--text-muted)' }} />
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '6px 12px' }}>
            <option value="default">Sort by...</option>
            <option value="alpha">Alphabetical (A-Z)</option>
            <option value="date">Date Recorded (Newest)</option>
          </select>
        </div>

        <button className="btn btn-ghost" onClick={() => {
          setSearch(''); setCourse(''); setMajor(''); setYear(''); setSection(''); setSemester(''); setSchoolYear(''); setSortBy('default');
        }}>Reset</button>
      </div>

      <div className="table-card">
        <style>{`
          .deficiency-actions .action-btn.resolve { color: var(--accent-green) !important; }
          .deficiency-actions .action-btn.resolve:hover { opacity: 0.9; }
        `}</style>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Semester</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, index) => {
              const s = students.find(st => st.student_id === d.student_id)
              const getDisplayId = (id) => id && !id.startsWith('TMP-') ? id : '-'
              const studentId = s ? getDisplayId(s.student_id) : getDisplayId(d.student_id)
              const studentName = s ? `${s.last_name}, ${s.first_name}` : 'Unknown Student'

              return (
                <tr
                  key={d.student_id}
                  className={d.status === 'pending' ? 'hover-row' : ''}
                  style={{ cursor: d.status === 'pending' ? 'pointer' : 'default' }}
                  onClick={() => onViewStudent?.(s)}
                >
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{index + 1}</td>
                  <td>
                    <span className="id-cell">{studentId}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{studentName}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{d.subject_code}</div>
                  </td>
                  <td><span className={`badge ${d.type.toLowerCase()}`}>{d.type}</span></td>
                  <td>{d.semester}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>

                  <td className="actions-cell">
                    <div className="deficiency-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                      {d.status === 'pending' ? (
                        <button
                          className="action-btn resolve"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResolve(d.deficiency_id)
                          }}
                          title="Resolve"
                          style={{
                            backgroundColor: 'transparent',
                            color: 'var(--accent-green)',
                            border: 'none',
                          }}
                        >
                          <i className="ph ph-check-circle" />
                        </button>
                      ) : (
                        <button
                          className="action-btn resolve"
                          disabled
                          onClick={(e) => e.stopPropagation()}
                          title="Resolve"
                          style={{
                            backgroundColor: 'transparent',
                            color: 'rgba(52, 211, 153, 0.35)',
                            border: 'none',
                            cursor: 'not-allowed',
                            opacity: 0.5,
                          }}
                        >
                          <i className="ph ph-check-circle" />
                        </button>
                      )}

                      {/* Always show delete */}
                      <button
                        className="action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(d.deficiency_id)
                        }}
                        title="Delete"
                        style={{
                          backgroundColor: 'transparent',
                          color: 'var(--accent-red)',
                          border: 'none',
                        }}
                      >
                        <i className="ph ph-trash" />
                      </button>
                    </div>
                  </td>
                </tr>

              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
