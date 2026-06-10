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

  const resetForm = () => setForm({ major: '', year_level: '1', semester: '1', subject_code: '', subject_name: '', units: '3' })

  async function handleSave() {
    setError('')
    if (!initialCourse) { setError('No program selected.'); return }
    if (!form.subject_code.trim()) { setError('Subject code is required.'); return }

    const code = form.subject_code.trim().toUpperCase()
    const major = form.major || null
    const year = parseInt(form.year_level)
    const sem = parseInt(form.semester)

    // Check for existing curriculum entry with same subject_code, major, year and semester
    setLoading(true)
    let existing = null
    try {
      const list = await curriculumService.getByCourse(initialCourse)
      existing = (list || []).find(c =>
        (c.subject_code || '').toUpperCase() === code &&
        (c.major || null) === major &&
        parseInt(c.year_level) === year &&
        parseInt(c.semester) === sem
      )
    } catch (e) {
      console.error('Duplicate check failed', e)
    }
    setLoading(false)

    if (existing) {
      const replace = window.confirm(
        `"${code}" already exists in this curriculum slot.\n\nOK → Replace with new details\nCancel → Keep existing entry`
      )
      if (!replace) return

      setLoading(true)
      try {
        await curriculumService.update(existing.curriculum_id || existing.id, {
          course: initialCourse,
          major: form.major || null,
          year_level: year,
          semester: sem,
          subject_code: code,
          subject_name: form.subject_name.trim() || null,
          units: parseInt(form.units) || 3,
        })
        resetForm()
        onSaved()
        onClose()
      } catch (err) {
        let conflictData = null
        try {
          const parsed = JSON.parse(err.message)
          if (parsed && parsed.type === 'SUBJECT_CONFLICT') {
            conflictData = parsed
          }
        } catch (e) {}

        if (conflictData) {
          const msg = `Subject code "${conflictData.subject_code}" already exists in the system as "${conflictData.existing.subject_name}" (${conflictData.existing.unit} units).\n\n` +
                      `Do you want to update the system to use the new name "${conflictData.incoming.subject_name}" (${conflictData.incoming.unit} units)?\n\n` +
                      `OK/Yes → Apply new details\nCancel/No → Keep existing details`
          const overwrite = window.confirm(msg)
          
          setLoading(true)
          try {
            await curriculumService.update(existing.curriculum_id || existing.id, {
              course: initialCourse,
              major: form.major || null,
              year_level: year,
              semester: sem,
              subject_code: code,
              subject_name: form.subject_name.trim() || null,
              units: parseInt(form.units) || 3,
            }, !overwrite, overwrite)
            resetForm()
            onSaved()
            onClose()
          } catch (retryErr) {
            setError(retryErr.message || 'Failed to update subject.')
          } finally {
            setLoading(false)
          }
          return
        }
        setError(err.message || 'Failed to update subject.')
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    try {
      await curriculumService.create({
        course: initialCourse,
        major: form.major || null,
        year_level: year,
        semester: sem,
        subject_code: code,
        subject_name: form.subject_name.trim() || null,
        units: parseInt(form.units) || 3,
      })
      resetForm()
      onSaved()
      onClose()
    } catch (err) {
      let conflictData = null
      try {
        const parsed = JSON.parse(err.message)
        if (parsed && parsed.type === 'SUBJECT_CONFLICT') {
          conflictData = parsed
        }
      } catch (e) {}

      if (conflictData) {
        const msg = `Subject code "${conflictData.subject_code}" already exists in the system as "${conflictData.existing.subject_name}" (${conflictData.existing.unit} units).\n\n` +
                    `Do you want to update the system to use the new name "${conflictData.incoming.subject_name}" (${conflictData.incoming.unit} units)?\n\n` +
                    `OK/Yes → Apply new details\nCancel/No → Keep existing details`
        const overwrite = window.confirm(msg)
        
        setLoading(true)
        try {
          await curriculumService.create({
            course: initialCourse,
            major: form.major || null,
            year_level: year,
            semester: sem,
            subject_code: code,
            subject_name: form.subject_name.trim() || null,
            units: parseInt(form.units) || 3,
          }, !overwrite, overwrite)
          resetForm()
          onSaved()
          onClose()
        } catch (retryErr) {
          setError(retryErr.message || 'Failed to add subject.')
        } finally {
          setLoading(false)
        }
        return
      }
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