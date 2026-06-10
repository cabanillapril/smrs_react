import { useEffect, useState } from 'react'
import Modal from '../Modal'

import { FormGroup, FormInput, FormSelect } from '../Form'
import { gradeService } from '../../services/api'

export default function EditGradeModal({ isOpen, onClose, onSaved, grade }) {
  const [form, setForm] = useState({
    subject_code: '',
    subject_name: '',
    instructor: '',
    midterm: '',
    finals: '',
    semester: '1',
    school_year: '',
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (!grade) return
    setForm({
      subject_code: grade.subject_code ?? '',
      subject_name: grade.subject_name ?? '',
      instructor: grade.instructor ?? '',
      midterm: grade.midterm ?? '',
      finals: grade.finals ?? '',
      semester: String(grade.semester ?? '1'),
      school_year: grade.school_year ?? '',
    })
  }, [isOpen, grade])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!grade) return
    setLoading(true)
    try {
      await gradeService.update(grade.grade_id, {
        subject_code: form.subject_code,
        subject_name: form.subject_name || null,
        instructor: form.instructor || null,
        midterm: form.midterm !== '' ? parseFloat(form.midterm) : null,
        finals: form.finals !== '' ? parseFloat(form.finals) : null,
        semester: parseInt(form.semester),
        school_year: form.school_year || null,
      })
      onSaved?.()
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
      title="Edit Grade Entry"
      size="narrow"
    >
      <div className="modal-body">
        <FormGroup label="Student ID">
          <FormInput value={grade?.student_id || ''} disabled />
          {grade?.student_name && (
            <div style={{
              marginTop: 4,
              fontSize: '0.85rem',
              color: 'var(--accent-blue)',
              fontWeight: 600
            }}>{grade.student_name}</div>
          )}
        </FormGroup>

        <FormGroup label="Subject Code" required>
          <FormInput value={form.subject_code} onChange={(e) => set('subject_code', e.target.value)} placeholder="e.g. MATH101" />
        </FormGroup>

        <FormGroup label="Subject Name">
          <FormInput value={form.subject_name} onChange={(e) => set('subject_name', e.target.value)} placeholder="e.g. College Algebra" />
        </FormGroup>

        <FormGroup label="Instructor">
          <FormInput value={form.instructor} onChange={(e) => set('instructor', e.target.value)} placeholder="Instructor Name (Optional)" />
        </FormGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Midterm Grade">
            <FormInput type="number" step="0.25" value={form.midterm} onChange={(e) => set('midterm', e.target.value)} placeholder="1.0-5.0" />
          </FormGroup>
          <FormGroup label="Finals Grade">
            <FormInput type="number" step="0.25" value={form.finals} onChange={(e) => set('finals', e.target.value)} placeholder="1.0-5.0" />
          </FormGroup>
        </div>

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
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}
