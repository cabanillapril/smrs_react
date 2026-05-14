import { useState } from 'react'
import Modal from '../Modal'
import { FormGroup, FormInput, FormSelect } from '../Form'
import { gradeService } from '../../services/api'
import { SEMESTERS } from '../../utils/constants'

export default function AddGradeModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    student_number: '',
    subject_code: '',
    midterm_grade: '',
    final_grade: '',
    semester: SEMESTERS[0],
  })
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.student_number || !form.subject_code) return
    setLoading(true)
    try {
      await gradeService.create({
        ...form,
        midterm_grade: form.midterm_grade ? parseFloat(form.midterm_grade) : null,
        final_grade: form.final_grade ? parseFloat(form.final_grade) : null,
      })
      setForm({
        student_number: '',
        subject_code: '',
        midterm_grade: '',
        final_grade: '',
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
        <FormGroup label="Student Number" required>
          <FormInput value={form.student_number} onChange={(e) => set('student_number', e.target.value)} placeholder="e.g. 23-00000" />
        </FormGroup>
        <FormGroup label="Subject Code" required>
          <FormInput value={form.subject_code} onChange={(e) => set('subject_code', e.target.value)} placeholder="e.g. MATH101" />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Midterm Grade">
            <FormInput type="number" step="0.25" value={form.midterm_grade} onChange={(e) => set('midterm_grade', e.target.value)} placeholder="1.0-5.0" />
          </FormGroup>
          <FormGroup label="Finals Grade">
            <FormInput type="number" step="0.25" value={form.final_grade} onChange={(e) => set('final_grade', e.target.value)} placeholder="1.0-5.0" />
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
