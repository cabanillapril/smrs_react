import { useState } from 'react'
import { useData } from '../context/AppContext'
import { SECTIONS, PROGRAMS, YEAR_LEVELS } from '../utils/constants'
import { useGrades } from '../hooks/useGrades'
import MajorSelect from './MajorSelect'

export default function GradesPage({ onAdd }) {
  const { grades, students } = useData()
  const { refresh, loading } = useGrades()

  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')

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

    return matchesSearch && matchesCourse && matchesMajor && matchesYear && matchesSection
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
              <th>Midterm</th>
              <th>Finals</th>
              <th>Final Grade</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g, index) => {
              const s = students.find(st => st.student_id === g.student_id)
              const studentId = s ? (s.student_id || s.student_id) : g.student_id
              const studentName = s ? `${s.last_name}, ${s.first_name}` : 'Unknown Student'

              return (
                <tr key={g.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{index + 1}</td>
                  <td>
                    <span className="id-cell">{studentId}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{studentName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s?.email || ''}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{g.subject_code}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.subject_name || '—'}</div>
                  </td>
                  <td>{g.midterm_grade || '—'}</td>
                  <td>{g.final_grade || '—'}</td>
                  <td><b>{g.computed_final_grade || '—'}</b></td>
                  <td>
                    <span className={`badge ${g.remarks === 'Passed' ? 'passed' : 'failed'}`}>
                      {g.remarks}
                    </span>
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
