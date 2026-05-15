import { useState } from 'react'
import Modal from '../Modal'
import { FormGroup, FormInput, FormSelect } from '../Form'
import { gradeService } from '../../services/api'
import { SEMESTERS } from '../../utils/constants'

export default function AddGradeModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    student_id: '',
    subject_code: '',
    midterm: '',
    finals: '',
    semester: SEMESTERS[0],
  })
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.student_id || !form.subject_code) return
    setLoading(true)
    try {
      await gradeService.create({
        student_id: form.student_id,
        subject_code: form.subject_code,
        semester: form.semester,
        school_year: form.school_year,
        midterm_grade: form.midterm ? parseFloat(form.midterm) : null,
        final_grade: form.finals ? parseFloat(form.finals) : null,
      })
      setForm({
        student_id: '',
        subject_code: '',
        midterm: '',
        finals: '',
        semester: SEMESTERS[0],
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
      title="Add Grade Entry"
      size="narrow"
    >
      <div className="modal-body">
        <FormGroup label="Student ID" required>
          <FormInput value={form.student_id} onChange={(e) => set('student_id', e.target.value)} placeholder="e.g. 23-00000" />
        </FormGroup>
        <FormGroup label="Subject Code" required>
          <FormInput value={form.subject_code} onChange={(e) => set('subject_code', e.target.value)} placeholder="e.g. MATH101" />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Midterm Grade">
            <FormInput type="number" step="0.25" value={form.midterm} onChange={(e) => set('midterm', e.target.value)} placeholder="1.0-5.0" />
          </FormGroup>
          <FormGroup label="Finals Grade">
            <FormInput type="number" step="0.25" value={form.finals} onChange={(e) => set('finals', e.target.value)} placeholder="1.0-5.0" />
          </FormGroup>
        </div>
        <FormGroup label="Semester">
          <FormSelect value={form.semester} onChange={(e) => set('semester', e.target.value)}>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </FormGroup>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save Grade'}
        </button>
      </div>
    </Modal>
  )
}
