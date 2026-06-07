import React, { useState } from 'react'
import { useData } from '../context/AppContext'
import { SECTIONS, PROGRAMS, YEAR_LEVELS } from '../utils/constants'
import { useGrades } from '../hooks/useGrades'
import MajorSelect from './MajorSelect'
import { gradeService } from '../services/api'

export default function GradesPage({ onAdd, onEdit, onViewStudent }) {
  const { grades, students } = useData()
  const { refresh, loading } = useGrades()

  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [semester, setSemester] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [sortBy, setSortBy] = useState('default')

  // Get unique school years from grades
  const availableSchoolYears = [...new Set(grades.map(g => g.school_year).filter(Boolean))].sort((a, b) => b.localeCompare(a))

  const filtered = grades.filter((g) => {
    const student = students.find(s => s.student_id === g.student_id)
    const studentName = student ? (student.first_name + ' ' + student.last_name).toLowerCase() : ''

    const matchesSearch =
      studentName.includes(search.toLowerCase()) ||
      g.student_id.toLowerCase().includes(search.toLowerCase()) ||
      g.subject_code.toLowerCase().includes(search.toLowerCase())

    const matchesCourse = !course || student?.course === course
    const matchesMajor = !major || student?.major === major
    const matchesYear = !year || student?.year_level === parseInt(year)
    const matchesSection = !section || student?.section === section
    const matchesSemester = !semester || String(g.semester) === String(semester)
    const matchesSchoolYear = !schoolYear || g.school_year === schoolYear

    return matchesSearch && matchesCourse && matchesMajor && matchesYear && matchesSection && matchesSemester && matchesSchoolYear
  })

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h1 className="page-title">Grades</h1>
          <p className="page-subtitle">View and manage student grade records</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
            <i className={`ph ph-arrows-clockwise ${loading ? 'ph-spin' : ''}`} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={onAdd}>+ Add Grade</button>
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
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Subject</th>
              <th>Instructor</th>
              <th>Midterm</th>
              <th>Finals</th>
              <th>Final Grade</th>
              <th>Remarks</th>
              <th style={{ width: '110px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const groupedByStudent = filtered.reduce((acc, g) => {
                if (!acc[g.student_id]) acc[g.student_id] = []
                acc[g.student_id].push(g)
                return acc
              }, {})

              let sortedKeys = Object.keys(groupedByStudent)
              if (sortBy === 'alpha') {
                sortedKeys = sortedKeys.sort((idA, idB) => {
                  const sA = students.find(st => st.student_id === idA)
                  const sB = students.find(st => st.student_id === idB)
                  const nameA = sA ? `${sA.last_name}, ${sA.first_name}`.toLowerCase() : 'zzzz'
                  const nameB = sB ? `${sB.last_name}, ${sB.first_name}`.toLowerCase() : 'zzzz'
                  return nameA.localeCompare(nameB)
                })
              } else if (sortBy === 'date') {
                sortedKeys = sortedKeys.sort((idA, idB) => {
                  const maxIdA = Math.max(...groupedByStudent[idA].map(g => g.grade_id))
                  const maxIdB = Math.max(...groupedByStudent[idB].map(g => g.grade_id))
                  return maxIdB - maxIdA
                })
              }

              let globalIndex = 1

              return sortedKeys.map(studentId => {
                const studentGrades = groupedByStudent[studentId]
                const s = students.find(st => st.student_id === studentId)
                const getDisplayId = (id) => id && !id.startsWith('TMP-') ? id : '-'
                const displayId = s ? getDisplayId(s.student_id) : getDisplayId(studentId)
                const studentName = s ? `${s.last_name}, ${s.first_name}` : 'Unknown Student'

                return (
                  <React.Fragment key={studentId}>
                    <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                      <td colSpan="8" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-normal)' }}>{studentName}</span>
                          <span style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{displayId}</span>
                          <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.8rem', marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); onViewStudent?.(s) }}>
                            View Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                    {studentGrades.map((g) => (
                      <tr key={g.grade_id} onClick={() => onViewStudent?.(s)} style={{ cursor: 'pointer' }}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{globalIndex++}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{g.subject_code}</div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{g.instructor || '—'}</div>
                        </td>
                        <td>{g.midterm || '—'}</td>
                        <td>{g.finals || '—'}</td>
                        <td><b>{g.grade || '—'}</b></td>
                        <td>
                          <span className={`badge ${g.remarks === 'Passed' ? 'passed' : 'failed'}`}>
                            {g.remarks}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                              className="action-btn edit"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit?.(g)
                              }}
                              title="Edit"
                              style={{
                                backgroundColor: 'transparent',
                                color: 'var(--accent-green)',
                                border: 'none',
                              }}
                            >
                              <i className="ph ph-pencil-simple" />
                            </button>

                            <button
                              className="action-btn delete"
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!confirm('Delete this grade record?')) return
                                try {
                                  await gradeService.delete(g.grade_id)
                                  refresh()
                                } catch (err) {
                                  alert(err.message)
                                }
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
                    ))}
                  </React.Fragment>
                )
              })
            })()}
          </tbody>
        </table>
      </div>
    </div>
  )
}
