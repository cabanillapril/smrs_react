import { useState } from 'react'
import { useData } from '../context/AppContext'
import { SECTIONS, PROGRAMS, YEAR_LEVELS, STATUSES } from '../utils/constants'
import { useStudents } from '../hooks/useStudents'
import MajorSelect from './MajorSelect'
import { StatusBadge } from './Badges'

export default function StudentsPage({ onEdit, onView, onAdd }) {
  const { students } = useData()
  const { refresh, loading } = useStudents()
  
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [status, setStatus] = useState('')

  const filtered = students.filter((s) => {
    const matchesSearch = 
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(search.toLowerCase()) ||
      (s.student_id || '').toLowerCase().includes(search.toLowerCase())
    
    const matchesCourse = !course || s.course === course
    const matchesMajor = !major || s.major === major
    const matchesYear = !year || s.year_level === parseInt(year)
    const matchesSection = !section || s.section === section
    const matchesStatus = !status || s.status === status

    return matchesSearch && matchesCourse && matchesMajor && matchesYear && matchesSection && matchesStatus
  })

  function resetFilters() {
    setSearch('')
    setCourse('')
    setMajor('')
    setYear('')
    setSection('')
    setStatus('')
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Manage and view all student records</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
            <i className={`ph ph-arrows-clockwise ${loading ? 'ph-spin' : ''}`} /> Refresh
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

        <button className="btn btn-ghost" onClick={resetFilters}>Reset</button>
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
                    {s.student_id || s.student_number}
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
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
