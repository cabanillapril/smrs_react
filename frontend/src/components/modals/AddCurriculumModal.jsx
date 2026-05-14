import { useState } from 'react'
import Modal from '../Modal'
import { FormGroup, FormInput, FormSelect } from '../Form'
import MajorSelect from '../MajorSelect'
import { curriculumService } from '../../services/api'

export default function AddCurriculumModal({ isOpen, onClose, onSaved, initialCourse }) {
  const [form, setForm] = useState({
    major: '',
    year_level: '1',
    semester: '1',
    subject_code: '',
    subject_name: '',
    units: '3',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setError('')
    if (!initialCourse) {
      setError('No program selected.')
      return
    }
    if (!form.subject_code.trim()) {
      setError('Subject code is required.')
      return
    }

    setLoading(true)
    try {
      await curriculumService.create({
        course: initialCourse,
        major: form.major || null,
        year_level: parseInt(form.year_level),
        semester: parseInt(form.semester),
        subject_code: form.subject_code.trim().toUpperCase(),
        subject_name: form.subject_name.trim() || form.subject_code.trim().toUpperCase(),
        units: parseInt(form.units) || 3,
      })
      setForm({ major: '', year_level: '1', semester: '1', subject_code: '', subject_name: '', units: '3' })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add subject.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Subject to Curriculum"
      size="narrow"
    >
      <div className="modal-body">
        <FormGroup label="Program">
          <FormInput value={initialCourse || ''} readOnly />
        </FormGroup>

        <FormGroup label="Major">
          <MajorSelect
            program={initialCourse}
            value={form.major}
            onChange={(e) => set('major', e.target.value)}
          />
        </FormGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Year Level">
            <FormSelect value={form.year_level} onChange={(e) => set('year_level', e.target.value)}>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </FormSelect>
          </FormGroup>
          <FormGroup label="Semester">
            <FormSelect value={form.semester} onChange={(e) => set('semester', e.target.value)}>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
            </FormSelect>
          </FormGroup>
        </div>

        <FormGroup label="Subject Code" required>
          <FormInput
            value={form.subject_code}
            onChange={(e) => set('subject_code', e.target.value)}
            placeholder="e.g. MATH101"
          />
        </FormGroup>

        <FormGroup label="Subject Name">
          <FormInput
            value={form.subject_name}
            onChange={(e) => set('subject_name', e.target.value)}
            placeholder="e.g. Calculus I"
          />
        </FormGroup>

        <FormGroup label="Units">
          <FormInput
            type="number"
            value={form.units}
            onChange={(e) => set('units', e.target.value)}
            min="1"
            max="9"
          />
        </FormGroup>

        {error && (
          <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Add to Curriculum'}
        </button>
      </div>
    </Modal>
  )
}