import { useState, useEffect } from 'react'
import { useData } from '../context/AppContext'
import { SECTIONS, PROGRAMS, YEAR_LEVELS, STATUSES } from '../utils/constants'
import { useStudents } from '../hooks/useStudents'
import { studentService } from '../services/api'
import MajorSelect from './MajorSelect'
import { StatusBadge } from './Badges'

export default function StudentsPage({ onEdit, onView, onAdd, globalSearch = '' }) {
  const { students, grades } = useData()
  const { refresh, loading } = useStudents()

  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [status, setStatus] = useState('')
  const [showGraduated, setShowGraduated] = useState(false)
  const [sortBy, setSortBy] = useState('default')
  const [semester, setSemester] = useState('')
  const [schoolYear, setSchoolYear] = useState('')

  const availableSchoolYears = [...new Set(grades.map(g => g.school_year).filter(Boolean))].sort((a, b) => b.localeCompare(a))

  let filtered = students.filter((s) => {
    if (!showGraduated && s.status === 'Graduated') return false
    const matchesSearch =
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(search.toLowerCase()) ||
      (s.student_id || '').toLowerCase().includes(search.toLowerCase())

    const matchesCourse = !course || s.course === course
    const matchesMajor = !major || s.major === major
    const matchesYear = !year || s.year_level === parseInt(year)
    const matchesSection = !section || s.section === section
    const matchesStatus = !status || s.status === status

    const studentGrades = grades.filter(g => g.student_id === s.student_id)
    const matchesSemester = !semester || studentGrades.some(g => String(g.semester) === String(semester))
    const matchesSchoolYear = !schoolYear || studentGrades.some(g => g.school_year === schoolYear)

    return matchesSearch && matchesCourse && matchesMajor && matchesYear && matchesSection && matchesStatus && matchesSemester && matchesSchoolYear
  })

  if (sortBy === 'alpha') {
    filtered.sort((a, b) => {
      const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
      const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })
  } else if (sortBy === 'date') {
    filtered.sort((a, b) => b.student_number - a.student_number)
  }

  function resetFilters() {
    setSearch('')
    setCourse('')
    setMajor('')
    setYear('')
    setSection('')
    setStatus('')
    setSortBy('default')
    setSemester('')
    setSchoolYear('')
  }

  async function handlePromote() {
    if (!confirm('Are you sure you want to promote all active students to the next year level? Graduates will not be affected.')) return
    try {
      const res = await studentService.promote()
      alert(res.message)
      refresh()
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleDelete(s) {
    if (!confirm(`Are you sure you want to permanently delete ${s.first_name} ${s.last_name}?`)) return
    try {
      await studentService.delete(s.student_number)
      refresh()
    } catch (err) {
      alert(`Failed to delete student: ${err.message}`)
    }
  }

  useEffect(() => {
    if (globalSearch !== undefined) setSearch(globalSearch)
  }, [globalSearch])

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Manage and view all student records</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={handlePromote}>
            <i className="ph ph-arrow-circle-up" /> Promote Year Levels
          </button>
          <button className="btn btn-primary" onClick={onAdd}>+ New Student</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-field">
          <span><i className="ph ph-magnifying-glass" /></span>
          <input
            type="text"
            placeholder="Name or Student ID…"
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

        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
            <option value="date">Date Added (Newest)</option>
          </select>
        </div>

        <button className="btn btn-ghost" onClick={resetFilters}>Reset</button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          <input type="checkbox" checked={showGraduated} onChange={(e) => setShowGraduated(e.target.checked)} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Show Graduated</span>
        </label>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Course</th>
              <th>Year</th>
              <th>Section</th>
              <th>Status</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, index) => (
              <tr
                key={s.student_number}
                onClick={() => onView(s)}
                style={{ cursor: 'pointer' }}
                className="hover-row"
              >
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{index + 1}</td>
                <td>
                  <span className="id-cell" style={{ color: 'var(--accent-blue)' }}>
                    {s.student_id && !s.student_id.startsWith('TMP-') ? s.student_id : "-"}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {s.last_name}, {s.first_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.course || '—'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.major || 'No Major'}</div>
                </td>
                <td>{s.year_level}</td>
                <td><span className="section-badge">{s.section}</span></td>
                <td><StatusBadge status={s.status} /></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <button
                      className="action-btn edit"
                      onClick={() => onView(s)}
                      title="Edit Profile"
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--accent-green)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <i className="ph ph-pencil-simple" />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(s)}
                      title="Delete"
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--accent-red)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <i className="ph ph-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No student records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span className="table-count">Showing {filtered.length} of {students.length} students</span>
      </div>
    </div>
  )
}
