import { useState } from 'react'
import { useData } from '../context/AppContext'
import { SECTIONS, PROGRAMS, YEAR_LEVELS, DEFICIENCY_TYPES } from '../utils/constants'

import { useDeficiencies } from '../hooks/useDeficiencies'
import { deficiencyService } from '../services/api'
import MajorSelect from './MajorSelect'
import { StatusBadge } from './Badges'

export default function DeficienciesPage({ onAdd }) {
  const { deficiencies, students } = useData()
  const { refresh, loading } = useDeficiencies()


  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')

  const filtered = deficiencies.filter((d) => {
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

    return matchesSearch && matchesCourse && matchesMajor && matchesYear && matchesSection
  })

  async function handleResolve(id) {
    if (!confirm('Mark this deficiency as resolved?')) return
    try {
      await deficiencyService.resolve(id, new Date().toISOString().split('T')[0])
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
          <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
            <i className={`ph ph-arrows-clockwise ${loading ? 'ph-spin' : ''}`} /> Refresh
          </button>
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

        <button className="btn btn-ghost" onClick={() => {
          setSearch(''); setCourse(''); setMajor(''); setYear(''); setSection('');
        }}>Reset</button>
      </div>

      <div className="table-card">
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
              const studentId = s ? (s.student_id || s.student_id) : d.student_id
              const studentName = s ? `${s.last_name}, ${s.first_name}` : 'Unknown Student'

              return (
                <tr
                  key={d.student_id}
                  className={d.status === 'pending' ? 'hover-row' : ''}
                  onClick={() => {
                    if (d.status === 'pending') handleResolve(d.id)
                  }}
                  style={{ cursor: d.status === 'pending' ? 'pointer' : 'default' }}
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
                  <td><StatusBadge status={d.status} /></td>
                  <td>
                    {d.status === 'pending' && (
                      <button
                        className="action-btn resolve"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResolve(d.student_id)
                        }}
                        title="Resolve"
                        style={{
                          backgroundColor: 'var(--accent-blue)',
                          color: 'white',
                          border: 'none',
                        }}
                      >
                        <i className="ph ph-check-circle" />
                      </button>
                    )}
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
