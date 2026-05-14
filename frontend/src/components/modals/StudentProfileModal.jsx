import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { StatusBadge } from '../Badges'
import { deficiencyService, gradeService, studentService } from '../../services/api'

export default function StudentProfileModal({ isOpen, onClose, student, onEdit, onDeleted, onAddGrade, onAddDeficiency }) {
  const [deficiencies, setDeficiencies] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (student && isOpen) {
      setActiveTab('profile')
      loadData()
    }
  }, [student, isOpen])

  async function loadData() {
    setLoading(true)
    try {
      const [d, g] = await Promise.all([
        deficiencyService.getByStudent(student.student_number),
        gradeService.getByStudent(student.student_number)
      ])
      setDeficiencies(d)
      setGrades(g)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to permanently delete ${student.first_name} ${student.last_name}?`)) return
    try {
      await studentService.delete(student.student_number)
      if (onDeleted) onDeleted()
    } catch (err) {
      alert(`Failed to delete student: ${err.message}`)
    }
  }

  if (!student) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Profile"
      size="large"
    >
      <div className="modal-tabs" style={{ display: 'flex', gap: '8px', padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
        <button
          className={`modal-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'profile' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'profile' ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: activeTab === 'profile' ? '600' : '500', cursor: 'pointer' }}
        >
          Profile Info
        </button>
        <button
          className={`modal-tab ${activeTab === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveTab('grades')}
          style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'grades' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'grades' ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: activeTab === 'grades' ? '600' : '500', cursor: 'pointer' }}
        >
          Grades History
        </button>
        <button
          className={`modal-tab ${activeTab === 'deficiencies' ? 'active' : ''}`}
          onClick={() => setActiveTab('deficiencies')}
          style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'deficiencies' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'deficiencies' ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: activeTab === 'deficiencies' ? '600' : '500', cursor: 'pointer' }}
        >
          Deficiencies
        </button>
      </div>

      <div className="modal-body profile-modal" style={{ padding: '24px' }}>
        <div className="profile-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
          <div className="profile-info-main">
            <h2>{student.first_name} {student.middle_name ? student.middle_name[0] + '.' : ''} {student.last_name}</h2>
            <div className="profile-subinfo" style={{ marginBottom: '12px' }}>
              <span className="id-cell" style={{ color: 'var(--accent-blue)' }}>{student.student_id || student.student_number}</span>
              <span className="dot">•</span>
              <StatusBadge status={student.status} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {student.course || 'No Program Selected'} — {student.year_level}{student.section}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}></div>
                <div style={{ fontWeight: '500' }}>{student.major || 'None'}</div>
              </div>
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onEdit}>
              <i className="ph ph-pencil-simple" /> Edit Profile
            </button>
            <button className="btn btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={handleDelete}>
              <i className="ph ph-trash" /> Delete
            </button>
          </div>
        </div>

        <div className="profile-content">
          {activeTab === 'profile' && (
            <div className="profile-section">
              <h3 className="section-title"></h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: 'var(--bg-raised)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Birthday</div>
                  <div style={{ fontWeight: '500' }}>{student.birthday || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Gender</div>
                  <div style={{ fontWeight: '500' }}>{student.gender || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Contact Number</div>
                  <div style={{ fontWeight: '500' }}>{student.contact_number || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                  <div style={{ fontWeight: '500' }}>{student.email || 'None'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Address</div>
                  <div style={{ fontWeight: '500' }}>{student.address || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Course</div>
                  <div style={{ fontWeight: '500' }}>{student.course || 'None'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Major</div>
                  <div style={{ fontWeight: '500' }}>{student.major || 'None'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Year</div>
                  <div style={{ fontWeight: '500' }}>{student.year || 'None'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Section</div>
                  <div style={{ fontWeight: '500' }}>{student.section || 'None'}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="profile-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Grades History</h3>
                <button className="btn btn-primary" onClick={() => onAddGrade && onAddGrade(student.student_number)}>+ Add Grade</button>
              </div>
              <div className="table-card min">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Midterm</th>
                      <th>Finals</th>
                      <th>Final Grade</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map(g => (
                      <tr key={g.id}>
                        <td>{g.subject_code}</td>
                        <td>{g.midterm_grade || '—'}</td>
                        <td>{g.final_grade || '—'}</td>
                        <td><b>{g.computed_final_grade || '—'}</b></td>
                        <td>
                          <span className={`badge ${g.remarks === 'Passed' ? 'passed' : 'failed'}`}>
                            {g.remarks}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {grades.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No grades recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'deficiencies' && (
            <div className="profile-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Deficiencies</h3>
                <button className="btn btn-primary" onClick={() => onAddDeficiency && onAddDeficiency(student.student_number)}>+ Record Deficiency</button>
              </div>
              <div className="table-card min">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Type</th>
                      <th>Semester</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deficiencies.map(d => (
                      <tr key={d.id}>
                        <td>{d.subject_code}</td>
                        <td><span className={`badge ${d.type.toLowerCase()}`}>{d.type}</span></td>
                        <td>{d.semester}</td>
                        <td><StatusBadge status={d.status} /></td>
                      </tr>
                    ))}
                    {deficiencies.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No deficiencies found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
