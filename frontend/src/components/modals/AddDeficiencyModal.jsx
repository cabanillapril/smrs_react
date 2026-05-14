import { useState } from 'react'
import Modal from '../Modal'
import { FormGroup, FormInput, FormSelect } from '../Form'
import { deficiencyService } from '../../services/api'
import { DEFICIENCY_TYPES, SEMESTERS } from '../../utils/constants'

export default function AddDeficiencyModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    student_id: '',
    subject_code: '',
    type: 'Incomplete',
    semester: SEMESTERS[0],
    date_recorded: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)

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
        type: 'Incomplete',
        semester: SEMESTERS[0],
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
        </FormGroup>
        <FormGroup label="Subject Code" required>
          <FormInput value={form.subject_code} onChange={(e) => set('subject_code', e.target.value)} placeholder="e.g. MATH101" />
        </FormGroup>
        <FormGroup label="Deficiency Type">
          <FormSelect value={form.type} onChange={(e) => set('type', e.target.value)}>
            {DEFICIENCY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </FormSelect>
        </FormGroup>
        <FormGroup label="Semester">
          <FormSelect value={form.semester} onChange={(e) => set('semester', e.target.value)}>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </FormGroup>
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
