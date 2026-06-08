import { useEffect, useState } from 'react'
import Modal from '../Modal'

import { FormGroup, FormInput, FormSelect } from '../Form'
import { deficiencyService } from '../../services/api'
import { useData } from '../../context/AppContext'
import { DEFICIENCY_TYPES } from '../../utils/constants'

export default function AddDeficiencyModal({ isOpen, onClose, onSaved, initialStudentId = '' }) {
  const { students } = useData()
  const [form, setForm] = useState({
    student_id: '',
    subject_code: '',
    subject_name: '',
    type: 'Incomplete',
    semester: '1',
    school_year: '2025-2026',
    date_recorded: new Date().toISOString().split('T')[0],
  })

  const [loading, setLoading] = useState(false)
  const [studentName, setStudentName] = useState('')

  // Auto-fetch student name when ID changes
  useEffect(() => {
    const id = form.student_id.trim().toUpperCase()
    if (id.length >= 4) {
      const found = students.find(s => (s.student_id || '').toUpperCase() === id)
      if (found) {
        setStudentName(`${found.first_name} ${found.last_name}`)
      } else {
        setStudentName('')
      }
    } else {
      setStudentName('')
    }
  }, [form.student_id, students])

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({ ...prev, student_id: initialStudentId || prev.student_id }))
      if (!initialStudentId) setStudentName('')
    }
  }, [isOpen, initialStudentId])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }


  async function handleSave() {
    if (!form.student_id || !form.subject_code) return
    setLoading(true)
    try {
      await deficiencyService.create(form)
      setForm({
        student_id: '',
        subject_code: '',
        subject_name: '',
        type: 'Incomplete',
        semester: '1',
        school_year: '2025-2026',
        date_recorded: new Date().toISOString().split('T')[0],
      })
      onSaved()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Deficiency"
      size="narrow"
    >
      <div className="modal-body">
        <FormGroup label="Student ID" required>
          <FormInput value={form.student_id} onChange={(e) => set('student_id', e.target.value)} placeholder="e.g. 23-00000" />
          {studentName && (
            <div style={{
              marginTop: 4,
              fontSize: '0.85rem',
              color: 'var(--accent-blue)',
              fontWeight: 600
            }}>{studentName}</div>
          )}
        </FormGroup>
        <FormGroup label="Subject Code" required>
          <FormInput value={form.subject_code} onChange={(e) => set('subject_code', e.target.value)} placeholder="e.g. MATH101" />
        </FormGroup>
        <FormGroup label="Subject Name">
          <FormInput value={form.subject_name} onChange={(e) => set('subject_name', e.target.value)} placeholder="e.g. Ethics" />
        </FormGroup>
        <FormGroup label="Deficiency Type">
          <FormSelect value={form.type} onChange={(e) => set('type', e.target.value)}>
            {DEFICIENCY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </FormSelect>
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Semester">
            <FormSelect value={form.semester} onChange={(e) => set('semester', e.target.value)}>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="3">Summer</option>
            </FormSelect>
          </FormGroup>
          <FormGroup label="School Year">
            <FormInput value={form.school_year} onChange={(e) => set('school_year', e.target.value)} placeholder="eg. 2025-2026" />
          </FormGroup>
        </div>
        <FormGroup label="Date Recorded">
          <FormInput type="date" value={form.date_recorded} onChange={(e) => set('date_recorded', e.target.value)} />
        </FormGroup>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Record Deficiency'}
        </button>
      </div>
    </Modal>
  )
}
